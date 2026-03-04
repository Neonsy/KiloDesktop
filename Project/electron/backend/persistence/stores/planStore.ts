import { getPersistence } from '@/app/backend/persistence/db';
import { nowIso, parseJsonValue } from '@/app/backend/persistence/stores/utils';
import type { PlanItemRecord, PlanQuestionRecord, PlanRecord } from '@/app/backend/persistence/types';
import { createEntityId } from '@/app/backend/runtime/contracts';
import type { EntityId, PlanStatus, TopLevelTab } from '@/app/backend/runtime/contracts';

function mapPlanRecord(row: {
    id: string;
    profile_id: string;
    session_id: string;
    top_level_tab: string;
    mode_key: string;
    status: string;
    source_prompt: string;
    summary_markdown: string;
    questions_json: string;
    answers_json: string;
    workspace_fingerprint: string | null;
    implementation_run_id: string | null;
    orchestrator_run_id: string | null;
    approved_at: string | null;
    implemented_at: string | null;
    created_at: string;
    updated_at: string;
}): PlanRecord {
    return {
        id: row.id as EntityId<'plan'>,
        profileId: row.profile_id,
        sessionId: row.session_id as EntityId<'sess'>,
        topLevelTab: row.top_level_tab as TopLevelTab,
        modeKey: row.mode_key,
        status: row.status as PlanStatus,
        sourcePrompt: row.source_prompt,
        summaryMarkdown: row.summary_markdown,
        questions: parseJsonValue<PlanQuestionRecord[]>(row.questions_json, []),
        answers: parseJsonValue<Record<string, string>>(row.answers_json, {}),
        ...(row.workspace_fingerprint ? { workspaceFingerprint: row.workspace_fingerprint } : {}),
        ...(row.implementation_run_id ? { implementationRunId: row.implementation_run_id as EntityId<'run'> } : {}),
        ...(row.orchestrator_run_id ? { orchestratorRunId: row.orchestrator_run_id as EntityId<'orch'> } : {}),
        ...(row.approved_at ? { approvedAt: row.approved_at } : {}),
        ...(row.implemented_at ? { implementedAt: row.implemented_at } : {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapPlanItemRecord(row: {
    id: string;
    plan_id: string;
    sequence: number;
    description: string;
    status: string;
    run_id: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}): PlanItemRecord {
    return {
        id: row.id as EntityId<'step'>,
        planId: row.plan_id as EntityId<'plan'>,
        sequence: row.sequence,
        description: row.description,
        status: row.status as PlanItemRecord['status'],
        ...(row.run_id ? { runId: row.run_id as EntityId<'run'> } : {}),
        ...(row.error_message ? { errorMessage: row.error_message } : {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export class PlanStore {
    async create(input: {
        profileId: string;
        sessionId: EntityId<'sess'>;
        topLevelTab: TopLevelTab;
        modeKey: string;
        sourcePrompt: string;
        summaryMarkdown: string;
        questions: PlanQuestionRecord[];
        workspaceFingerprint?: string;
    }): Promise<PlanRecord> {
        const { db } = getPersistence();
        const now = nowIso();
        const id = createEntityId('plan');

        await db
            .insertInto('plan_records')
            .values({
                id,
                profile_id: input.profileId,
                session_id: input.sessionId,
                top_level_tab: input.topLevelTab,
                mode_key: input.modeKey,
                status: input.questions.length > 0 ? 'awaiting_answers' : 'draft',
                source_prompt: input.sourcePrompt,
                summary_markdown: input.summaryMarkdown,
                questions_json: JSON.stringify(input.questions),
                answers_json: JSON.stringify({}),
                workspace_fingerprint: input.workspaceFingerprint ?? null,
                implementation_run_id: null,
                orchestrator_run_id: null,
                approved_at: null,
                implemented_at: null,
                created_at: now,
                updated_at: now,
            })
            .execute();

        const row = await db.selectFrom('plan_records').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
        return mapPlanRecord(row);
    }

    async getById(profileId: string, planId: EntityId<'plan'>): Promise<PlanRecord | null> {
        const { db } = getPersistence();
        const row = await db
            .selectFrom('plan_records')
            .selectAll()
            .where('profile_id', '=', profileId)
            .where('id', '=', planId)
            .executeTakeFirst();

        return row ? mapPlanRecord(row) : null;
    }

    async getLatestBySession(profileId: string, sessionId: EntityId<'sess'>, topLevelTab: TopLevelTab): Promise<PlanRecord | null> {
        const { db } = getPersistence();
        const row = await db
            .selectFrom('plan_records')
            .selectAll()
            .where('profile_id', '=', profileId)
            .where('session_id', '=', sessionId)
            .where('top_level_tab', '=', topLevelTab)
            .orderBy('created_at', 'desc')
            .executeTakeFirst();

        return row ? mapPlanRecord(row) : null;
    }

    async listItems(planId: EntityId<'plan'>): Promise<PlanItemRecord[]> {
        const { db } = getPersistence();
        const rows = await db
            .selectFrom('plan_items')
            .selectAll()
            .where('plan_id', '=', planId)
            .orderBy('sequence', 'asc')
            .execute();

        return rows.map(mapPlanItemRecord);
    }

    async replaceItems(planId: EntityId<'plan'>, descriptions: string[]): Promise<PlanItemRecord[]> {
        const { db } = getPersistence();
        const now = nowIso();

        await db.deleteFrom('plan_items').where('plan_id', '=', planId).execute();
        if (descriptions.length === 0) {
            return [];
        }

        await db
            .insertInto('plan_items')
            .values(
                descriptions.map((description, index) => ({
                    id: createEntityId('step'),
                    plan_id: planId,
                    sequence: index + 1,
                    description,
                    status: 'pending',
                    run_id: null,
                    error_message: null,
                    created_at: now,
                    updated_at: now,
                }))
            )
            .execute();

        return this.listItems(planId);
    }

    async setAnswer(planId: EntityId<'plan'>, questionId: string, answer: string): Promise<PlanRecord | null> {
        const { db } = getPersistence();
        const row = await db.selectFrom('plan_records').selectAll().where('id', '=', planId).executeTakeFirst();
        if (!row) {
            return null;
        }

        const now = nowIso();
        const questions = parseJsonValue<PlanQuestionRecord[]>(row.questions_json, []);
        const answers = parseJsonValue<Record<string, string>>(row.answers_json, {});
        answers[questionId] = answer;
        const hasUnanswered = questions.some((question) => {
            const response = answers[question.id];
            return typeof response !== 'string' || response.trim().length === 0;
        });

        const updated = await db
            .updateTable('plan_records')
            .set({
                answers_json: JSON.stringify(answers),
                status: hasUnanswered ? 'awaiting_answers' : 'draft',
                updated_at: now,
            })
            .where('id', '=', planId)
            .returningAll()
            .executeTakeFirst();

        return updated ? mapPlanRecord(updated) : null;
    }

    async revise(planId: EntityId<'plan'>, summaryMarkdown: string): Promise<PlanRecord | null> {
        const { db } = getPersistence();
        const now = nowIso();
        const updated = await db
            .updateTable('plan_records')
            .set({
                summary_markdown: summaryMarkdown,
                status: 'draft',
                updated_at: now,
            })
            .where('id', '=', planId)
            .returningAll()
            .executeTakeFirst();

        return updated ? mapPlanRecord(updated) : null;
    }

    async approve(planId: EntityId<'plan'>): Promise<PlanRecord | null> {
        const { db } = getPersistence();
        const now = nowIso();
        const updated = await db
            .updateTable('plan_records')
            .set({
                status: 'approved',
                approved_at: now,
                updated_at: now,
            })
            .where('id', '=', planId)
            .returningAll()
            .executeTakeFirst();

        return updated ? mapPlanRecord(updated) : null;
    }

    async markImplementing(
        planId: EntityId<'plan'>,
        implementationRunId?: EntityId<'run'>,
        orchestratorRunId?: EntityId<'orch'>
    ): Promise<PlanRecord | null> {
        const { db } = getPersistence();
        const now = nowIso();
        const updated = await db
            .updateTable('plan_records')
            .set({
                status: 'implementing',
                implementation_run_id: implementationRunId ?? null,
                orchestrator_run_id: orchestratorRunId ?? null,
                updated_at: now,
            })
            .where('id', '=', planId)
            .returningAll()
            .executeTakeFirst();

        return updated ? mapPlanRecord(updated) : null;
    }

    async markImplemented(planId: EntityId<'plan'>): Promise<PlanRecord | null> {
        const { db } = getPersistence();
        const now = nowIso();
        const updated = await db
            .updateTable('plan_records')
            .set({
                status: 'implemented',
                implemented_at: now,
                updated_at: now,
            })
            .where('id', '=', planId)
            .returningAll()
            .executeTakeFirst();

        return updated ? mapPlanRecord(updated) : null;
    }

    async markFailed(planId: EntityId<'plan'>): Promise<PlanRecord | null> {
        const { db } = getPersistence();
        const now = nowIso();
        const updated = await db
            .updateTable('plan_records')
            .set({
                status: 'failed',
                updated_at: now,
            })
            .where('id', '=', planId)
            .returningAll()
            .executeTakeFirst();

        return updated ? mapPlanRecord(updated) : null;
    }

    async setItemStatus(
        itemId: EntityId<'step'>,
        status: PlanItemRecord['status'],
        runId?: EntityId<'run'>,
        errorMessage?: string
    ): Promise<PlanItemRecord | null> {
        const { db } = getPersistence();
        const now = nowIso();
        const updated = await db
            .updateTable('plan_items')
            .set({
                status,
                run_id: runId ?? null,
                error_message: errorMessage ?? null,
                updated_at: now,
            })
            .where('id', '=', itemId)
            .returningAll()
            .executeTakeFirst();

        return updated ? mapPlanItemRecord(updated) : null;
    }
}

export const planStore = new PlanStore();
