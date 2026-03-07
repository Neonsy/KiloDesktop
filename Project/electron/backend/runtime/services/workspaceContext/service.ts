import { conversationStore, sessionStore, threadStore, workspaceRootStore, worktreeStore } from '@/app/backend/persistence/stores';
import type { ThreadRecord } from '@/app/backend/persistence/types';
import type { EntityId, ResolvedWorkspaceContext } from '@/app/backend/runtime/contracts';
import { worktreeService } from '@/app/backend/runtime/services/worktree/service';

async function resolveWorkspaceBoundContext(input: {
    profileId: string;
    workspaceFingerprint: string;
    thread: ThreadRecord;
    sessionWorktreeId?: EntityId<'wt'>;
}): Promise<ResolvedWorkspaceContext> {
    const workspaceRoot = await workspaceRootStore.getByFingerprint(input.profileId, input.workspaceFingerprint);
    if (!workspaceRoot) {
        return {
            kind: 'workspace',
            workspaceFingerprint: input.workspaceFingerprint,
            label: input.workspaceFingerprint,
            absolutePath: 'Unresolved workspace root',
            executionEnvironmentMode: input.thread.executionEnvironmentMode === 'worktree' ? 'local' : input.thread.executionEnvironmentMode,
            ...(input.thread.executionBranch ? { executionBranch: input.thread.executionBranch } : {}),
            ...(input.thread.baseBranch ? { baseBranch: input.thread.baseBranch } : {}),
        };
    }

    const effectiveWorktreeId = input.sessionWorktreeId ?? input.thread.worktreeId;
    if (effectiveWorktreeId) {
        const worktree = await worktreeStore.getById(input.profileId, effectiveWorktreeId);
        if (worktree) {
            return {
                kind: 'worktree',
                workspaceFingerprint: input.workspaceFingerprint,
                label: worktree.label,
                absolutePath: worktree.absolutePath,
                executionEnvironmentMode: 'worktree',
                worktree,
                baseWorkspace: {
                    label: workspaceRoot.label,
                    absolutePath: workspaceRoot.absolutePath,
                },
            };
        }
    }

    return {
        kind: 'workspace',
        workspaceFingerprint: input.workspaceFingerprint,
        label: workspaceRoot.label,
        absolutePath: workspaceRoot.absolutePath,
        executionEnvironmentMode: input.thread.executionEnvironmentMode === 'worktree' ? 'local' : input.thread.executionEnvironmentMode,
        ...(input.thread.executionBranch ? { executionBranch: input.thread.executionBranch } : {}),
        ...(input.thread.baseBranch ? { baseBranch: input.thread.baseBranch } : {}),
    };
}

export class WorkspaceContextService {
    async resolveForSession(input: {
        profileId: string;
        sessionId: EntityId<'sess'>;
        topLevelTab?: ThreadRecord['topLevelTab'];
        allowLazyWorktreeCreation?: boolean;
    }): Promise<ResolvedWorkspaceContext | null> {
        const sessionThread = await threadStore.getBySessionId(input.profileId, input.sessionId);
        if (!sessionThread) {
            return null;
        }

        if (sessionThread.scope === 'detached' || !sessionThread.workspaceFingerprint) {
            return { kind: 'detached' };
        }

        let thread = sessionThread.thread;
        let sessionWorktreeId = sessionThread.sessionWorktreeId;
        if (
            input.allowLazyWorktreeCreation &&
            thread.executionEnvironmentMode === 'new_worktree' &&
            thread.topLevelTab !== 'chat'
        ) {
            const created = await worktreeService.materializeThreadWorktree({
                profileId: input.profileId,
                thread,
                workspaceFingerprint: sessionThread.workspaceFingerprint,
            });
            if (created.isOk() && created.value) {
                thread = {
                    ...thread,
                    executionEnvironmentMode: 'worktree',
                    executionBranch: created.value.branch,
                    baseBranch: created.value.baseBranch,
                    worktreeId: created.value.id,
                };
                const updatedSession = await sessionStore.setWorktreeBinding({
                    profileId: input.profileId,
                    sessionId: input.sessionId,
                    worktreeId: created.value.id,
                });
                sessionWorktreeId = updatedSession?.worktreeId ?? created.value.id;
            }
        } else if (!sessionWorktreeId && thread.worktreeId) {
            const updatedSession = await sessionStore.setWorktreeBinding({
                profileId: input.profileId,
                sessionId: input.sessionId,
                worktreeId: thread.worktreeId,
            });
            sessionWorktreeId = updatedSession?.worktreeId ?? thread.worktreeId;
        }

        return resolveWorkspaceBoundContext({
            profileId: input.profileId,
            workspaceFingerprint: sessionThread.workspaceFingerprint,
            thread,
            ...(sessionWorktreeId ? { sessionWorktreeId } : {}),
        });
    }

    async resolveForThread(input: { profileId: string; threadId: EntityId<'thr'> }): Promise<ResolvedWorkspaceContext | null> {
        const thread = await threadStore.getById(input.profileId, input.threadId);
        if (!thread) {
            return null;
        }

        const bucket = await conversationStore.getBucketById(input.profileId, thread.conversationId);
        if (!bucket || bucket.scope === 'detached' || !bucket.workspaceFingerprint) {
            return { kind: 'detached' };
        }

        return resolveWorkspaceBoundContext({
            profileId: input.profileId,
            workspaceFingerprint: bucket.workspaceFingerprint,
            thread,
        });
    }

    async resolveExplicit(input: {
        profileId: string;
        workspaceFingerprint?: string;
        worktreeId?: EntityId<'wt'>;
    }): Promise<ResolvedWorkspaceContext> {
        if (!input.workspaceFingerprint) {
            return { kind: 'detached' };
        }

        const workspaceRoot = await workspaceRootStore.getByFingerprint(input.profileId, input.workspaceFingerprint);
        if (!workspaceRoot) {
            return {
                kind: 'workspace',
                workspaceFingerprint: input.workspaceFingerprint,
                label: input.workspaceFingerprint,
                absolutePath: 'Unresolved workspace root',
                executionEnvironmentMode: 'local',
            };
        }

        if (input.worktreeId) {
            const worktree = await worktreeStore.getById(input.profileId, input.worktreeId);
            if (worktree) {
                return {
                    kind: 'worktree',
                    workspaceFingerprint: input.workspaceFingerprint,
                    label: worktree.label,
                    absolutePath: worktree.absolutePath,
                    executionEnvironmentMode: 'worktree',
                    worktree,
                    baseWorkspace: {
                        label: workspaceRoot.label,
                        absolutePath: workspaceRoot.absolutePath,
                    },
                };
            }
        }

        return {
            kind: 'workspace',
            workspaceFingerprint: input.workspaceFingerprint,
            label: workspaceRoot.label,
            absolutePath: workspaceRoot.absolutePath,
            executionEnvironmentMode: 'local',
        };
    }
}

export const workspaceContextService = new WorkspaceContextService();
