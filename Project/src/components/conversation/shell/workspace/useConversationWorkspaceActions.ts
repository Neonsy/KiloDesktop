import { useConversationMutations } from '@/web/components/conversation/shell/actions/useConversationMutations';
import { useConversationQueries } from '@/web/components/conversation/shell/queries/useConversationQueries';
import { useConversationRefetch } from '@/web/components/conversation/shell/queries/useConversationRefetch';
import { isEntityId } from '@/web/components/conversation/shell/workspace/helpers';

import type { PermissionRecord } from '@/app/backend/persistence/types';
import type {
    ConversationSetThreadExecutionEnvironmentInput,
    EntityId,
    PermissionResolution,
} from '@/app/backend/runtime/contracts';

interface UseConversationWorkspaceActionsInput {
    profileId: string;
    queries: ReturnType<typeof useConversationQueries>;
    mutations: ReturnType<typeof useConversationMutations>;
    refetch: ReturnType<typeof useConversationRefetch>;
    onResolvePermission: () => void;
}

export function useConversationWorkspaceActions(input: UseConversationWorkspaceActionsInput) {
    return {
        async resolvePermission(payload: {
            requestId: PermissionRecord['id'];
            resolution: PermissionResolution;
            selectedApprovalResource?: string;
        }) {
            input.onResolvePermission();
            await input.mutations.resolvePermissionMutation.mutateAsync({
                profileId: input.profileId,
                requestId: payload.requestId,
                resolution: payload.resolution,
                ...(payload.selectedApprovalResource
                    ? { selectedApprovalResource: payload.selectedApprovalResource }
                    : {}),
            });
            await input.refetch.refetchPendingPermissions();
        },
        async configureThreadExecution(payload: {
            threadId: EntityId<'thr'>;
            executionInput: Pick<
                ConversationSetThreadExecutionEnvironmentInput,
                'mode' | 'executionBranch' | 'baseBranch' | 'worktreeId'
            >;
        }) {
            const selectedWorktreeId =
                payload.executionInput.mode === 'worktree' && isEntityId(payload.executionInput.worktreeId, 'wt')
                    ? payload.executionInput.worktreeId
                    : undefined;
            await input.mutations.configureThreadWorktreeMutation.mutateAsync({
                profileId: input.profileId,
                threadId: payload.threadId,
                mode: payload.executionInput.mode,
                ...(payload.executionInput.executionBranch
                    ? { executionBranch: payload.executionInput.executionBranch }
                    : {}),
                ...(payload.executionInput.baseBranch ? { baseBranch: payload.executionInput.baseBranch } : {}),
                ...(selectedWorktreeId ? { worktreeId: selectedWorktreeId } : {}),
            });
            await input.refetch.refetchExecutionEnvironment();
        },
        async refreshWorktree(worktreeId: `wt_${string}`) {
            await input.mutations.refreshWorktreeMutation.mutateAsync({
                profileId: input.profileId,
                worktreeId,
            });
            await input.queries.shellBootstrapQuery.refetch();
        },
        async removeWorktree(worktreeId: `wt_${string}`) {
            await input.mutations.removeWorktreeMutation.mutateAsync({
                profileId: input.profileId,
                worktreeId,
                removeFiles: true,
            });
            await input.refetch.refetchExecutionEnvironment();
        },
        async removeOrphanedWorktrees(workspaceFingerprint: string | undefined) {
            await input.mutations.removeOrphanedWorktreesMutation.mutateAsync({
                profileId: input.profileId,
                ...(workspaceFingerprint ? { workspaceFingerprint } : {}),
            });
            await input.queries.shellBootstrapQuery.refetch();
        },
    };
}
