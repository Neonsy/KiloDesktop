import { planStore, runStore } from '@/app/backend/persistence/stores';
import type { PlanQuestionRecord } from '@/app/backend/persistence/types';
import type { EntityId, PlanAnswerQuestionInput, PlanImplementInput, PlanRecordView, PlanReviseInput, PlanStartInput } from '@/app/backend/runtime/contracts';
import { orchestratorExecutionService } from '@/app/backend/runtime/services/orchestrator/executionService';
import { runExecutionService } from '@/app/backend/runtime/services/runExecution/service';
import { runtimeEventLogService } from '@/app/backend/runtime/services/runtimeEventLog';

function createDefaultQuestions(prompt: string): PlanQuestionRecord[] {
    const normalized = prompt.trim();
    if (normalized.length === 0) {
        return [];
    }

    return [
        {
            id: 'scope',
            question: 'What exact output should this plan produce first?',
        },
        {
            id: 'constraints',
            question: 'Which constraints are non-negotiable for implementation?',
        },
    ];
}

function toPlanView(plan: Awaited<ReturnType<typeof planStore.getById>>, items: Awaited<ReturnType<typeof planStore.listItems>>): PlanRecordView | null {
    if (!plan) {
        return null;
    }

    return {
        id: plan.id,
        profileId: plan.profileId,
        sessionId: plan.sessionId,
        topLevelTab: plan.topLevelTab,
        modeKey: plan.modeKey,
        status: plan.status,
        sourcePrompt: plan.sourcePrompt,
        summaryMarkdown: plan.summaryMarkdown,
        questions: plan.questions.map((question) => ({
            id: question.id,
            question: question.question,
            ...(plan.answers[question.id] ? { answer: plan.answers[question.id] } : {}),
        })),
        items: items.map((item) => ({
            id: item.id,
            sequence: item.sequence,
            description: item.description,
            status: item.status,
            ...(item.runId ? { runId: item.runId } : {}),
            ...(item.errorMessage ? { errorMessage: item.errorMessage } : {}),
        })),
        ...(plan.workspaceFingerprint ? { workspaceFingerprint: plan.workspaceFingerprint } : {}),
        ...(plan.implementationRunId ? { implementationRunId: plan.implementationRunId } : {}),
        ...(plan.orchestratorRunId ? { orchestratorRunId: plan.orchestratorRunId } : {}),
        ...(plan.approvedAt ? { approvedAt: plan.approvedAt } : {}),
        ...(plan.implementedAt ? { implementedAt: plan.implementedAt } : {}),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
    };
}

export class PlanService {
    async start(input: PlanStartInput): Promise<{ plan: PlanRecordView }> {
        if (input.modeKey !== 'plan') {
            throw new Error(`Plan flow only supports "plan" mode, received "${input.modeKey}".`);
        }
        if (input.topLevelTab === 'chat') {
            throw new Error('Planning flow is only available in agent or orchestrator tabs.');
        }

        const questions = createDefaultQuestions(input.prompt);
        const summaryMarkdown = `# Plan\n\n${input.prompt.trim()}`;
        const plan = await planStore.create({
            profileId: input.profileId,
            sessionId: input.sessionId,
            topLevelTab: input.topLevelTab,
            modeKey: input.modeKey,
            sourcePrompt: input.prompt.trim(),
            summaryMarkdown,
            questions,
            ...(input.workspaceFingerprint ? { workspaceFingerprint: input.workspaceFingerprint } : {}),
        });

        await runtimeEventLogService.append({
            entityType: 'plan',
            entityId: plan.id,
            eventType: 'plan.started',
            payload: {
                profileId: input.profileId,
                sessionId: input.sessionId,
                topLevelTab: input.topLevelTab,
                planId: plan.id,
            },
        });

        for (const question of questions) {
            await runtimeEventLogService.append({
                entityType: 'plan',
                entityId: plan.id,
                eventType: 'plan.question.requested',
                payload: {
                    planId: plan.id,
                    questionId: question.id,
                    question: question.question,
                },
            });
        }

        return {
            plan: toPlanView(plan, []) as PlanRecordView,
        };
    }

    async getById(profileId: string, planId: EntityId<'plan'>): Promise<{ found: false } | { found: true; plan: PlanRecordView }> {
        const plan = await planStore.getById(profileId, planId);
        if (!plan) {
            return { found: false };
        }

        if (plan.status === 'implementing' && plan.implementationRunId) {
            const run = await runStore.getById(plan.implementationRunId);
            if (run?.status === 'completed') {
                await planStore.markImplemented(plan.id);
            } else if (run?.status === 'aborted' || run?.status === 'error') {
                await planStore.markFailed(plan.id);
            }
        }

        const refreshed = await planStore.getById(profileId, planId);
        const items = await planStore.listItems(planId);
        const view = toPlanView(refreshed, items);
        if (!view) {
            return { found: false };
        }

        return {
            found: true,
            plan: view,
        };
    }

    async getActiveBySession(input: {
        profileId: string;
        sessionId: EntityId<'sess'>;
        topLevelTab: 'chat' | 'agent' | 'orchestrator';
    }): Promise<{ found: false } | { found: true; plan: PlanRecordView }> {
        const plan = await planStore.getLatestBySession(input.profileId, input.sessionId, input.topLevelTab);
        if (!plan) {
            return { found: false };
        }

        if (plan.status === 'implementing' && plan.implementationRunId) {
            const run = await runStore.getById(plan.implementationRunId);
            if (run?.status === 'completed') {
                await planStore.markImplemented(plan.id);
            } else if (run?.status === 'aborted' || run?.status === 'error') {
                await planStore.markFailed(plan.id);
            }
        }

        const refreshed = await planStore.getById(input.profileId, plan.id);
        const items = await planStore.listItems(plan.id);
        const view = toPlanView(refreshed, items);
        if (!view) {
            return { found: false };
        }

        return { found: true, plan: view };
    }

    async answerQuestion(input: PlanAnswerQuestionInput): Promise<{ found: false } | { found: true; plan: PlanRecordView }> {
        const updated = await planStore.setAnswer(input.planId, input.questionId, input.answer);
        if (!updated || updated.profileId !== input.profileId) {
            return { found: false };
        }

        await runtimeEventLogService.append({
            entityType: 'plan',
            entityId: input.planId,
            eventType: 'plan.question.answered',
            payload: {
                planId: input.planId,
                questionId: input.questionId,
            },
        });

        const items = await planStore.listItems(input.planId);
        return {
            found: true,
            plan: toPlanView(updated, items) as PlanRecordView,
        };
    }

    async revise(input: PlanReviseInput): Promise<{ found: false } | { found: true; plan: PlanRecordView }> {
        const revised = await planStore.revise(input.planId, input.summaryMarkdown);
        if (!revised || revised.profileId !== input.profileId) {
            return { found: false };
        }

        const descriptions = input.items.map((item) => item.description.trim()).filter((description) => description.length > 0);
        const items = await planStore.replaceItems(input.planId, descriptions);

        return {
            found: true,
            plan: toPlanView(revised, items) as PlanRecordView,
        };
    }

    async approve(profileId: string, planId: EntityId<'plan'>): Promise<{ found: false } | { found: true; plan: PlanRecordView }> {
        const existing = await planStore.getById(profileId, planId);
        if (!existing) {
            return { found: false };
        }

        const hasUnanswered = existing.questions.some((question) => {
            const answer = existing.answers[question.id];
            return typeof answer !== 'string' || answer.trim().length === 0;
        });
        if (hasUnanswered) {
            throw new Error('Cannot approve plan before answering all clarifying questions.');
        }

        const approved = await planStore.approve(planId);
        const items = await planStore.listItems(planId);

        await runtimeEventLogService.append({
            entityType: 'plan',
            entityId: planId,
            eventType: 'plan.approved',
            payload: {
                planId,
                profileId,
            },
        });

        return {
            found: true,
            plan: toPlanView(approved, items) as PlanRecordView,
        };
    }

    async implement(input: PlanImplementInput): Promise<
        | { found: false }
        | { found: true; started: true; mode: 'agent.code'; runId: EntityId<'run'>; plan: PlanRecordView }
        | { found: true; started: true; mode: 'orchestrator.orchestrate'; orchestratorRunId: EntityId<'orch'>; plan: PlanRecordView }
    > {
        const plan = await planStore.getById(input.profileId, input.planId);
        if (!plan) {
            return { found: false };
        }
        if (plan.status !== 'approved' && plan.status !== 'implementing') {
            throw new Error('Plan must be approved before implementation.');
        }

        if (plan.topLevelTab === 'agent') {
            const items = await planStore.listItems(plan.id);
            const taskList = items.map((item) => `- ${item.description}`).join('\n');
            const implementationPrompt = [
                'Implement the approved plan.',
                '',
                'Plan summary:',
                plan.summaryMarkdown,
                '',
                'Plan steps:',
                taskList.length > 0 ? taskList : '- No explicit steps were provided.',
            ].join('\n');

            const result = await runExecutionService.startRun({
                profileId: input.profileId,
                sessionId: plan.sessionId,
                prompt: implementationPrompt,
                topLevelTab: 'agent',
                modeKey: 'code',
                runtimeOptions: input.runtimeOptions,
                ...(input.providerId ? { providerId: input.providerId } : {}),
                ...(input.modelId ? { modelId: input.modelId } : {}),
                ...(input.workspaceFingerprint ? { workspaceFingerprint: input.workspaceFingerprint } : {}),
            });

            if (!result.accepted) {
                throw new Error(`Plan implementation failed to start: ${result.reason}.`);
            }

            const implementing = await planStore.markImplementing(plan.id, result.runId);
            await runtimeEventLogService.append({
                entityType: 'plan',
                entityId: plan.id,
                eventType: 'plan.implementation.started',
                payload: {
                    planId: plan.id,
                    profileId: input.profileId,
                    mode: 'agent.code',
                    runId: result.runId,
                },
            });

            return {
                found: true,
                started: true,
                mode: 'agent.code',
                runId: result.runId,
                plan: toPlanView(implementing, items) as PlanRecordView,
            };
        }

        if (plan.topLevelTab === 'orchestrator') {
            const started = await orchestratorExecutionService.start({
                profileId: input.profileId,
                planId: input.planId,
                runtimeOptions: input.runtimeOptions,
                ...(input.providerId ? { providerId: input.providerId } : {}),
                ...(input.modelId ? { modelId: input.modelId } : {}),
                ...(input.workspaceFingerprint ? { workspaceFingerprint: input.workspaceFingerprint } : {}),
            });
            const implementing = await planStore.markImplementing(plan.id, undefined, started.run.id);
            const items = await planStore.listItems(plan.id);

            await runtimeEventLogService.append({
                entityType: 'plan',
                entityId: plan.id,
                eventType: 'plan.implementation.started',
                payload: {
                    planId: plan.id,
                    profileId: input.profileId,
                    mode: 'orchestrator.orchestrate',
                    orchestratorRunId: started.run.id,
                },
            });

            return {
                found: true,
                started: true,
                mode: 'orchestrator.orchestrate',
                orchestratorRunId: started.run.id,
                plan: toPlanView(implementing, items) as PlanRecordView,
            };
        }

        throw new Error('Chat plans cannot be implemented through plan.implement.');
    }
}

export const planService = new PlanService();
