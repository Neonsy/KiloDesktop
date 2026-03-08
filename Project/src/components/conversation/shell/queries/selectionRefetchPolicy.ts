interface ConversationSelectionSnapshot {
    profileId: string;
    topLevelTab: 'chat' | 'agent' | 'orchestrator';
    workspaceFingerprint?: string;
    selectedThreadId?: string;
    selectedSessionId?: string;
    selectedRunId?: string;
}

export interface ConversationSelectionRefetchPolicy {
    refetchThreadChrome: boolean;
    refetchSessionWorkspace: boolean;
    refetchPlanWorkspace: boolean;
}

export function buildConversationSelectionRefetchPolicy(
    previousSelection: ConversationSelectionSnapshot,
    nextSelection: ConversationSelectionSnapshot
): ConversationSelectionRefetchPolicy {
    if (
        previousSelection.profileId === nextSelection.profileId &&
        previousSelection.topLevelTab === nextSelection.topLevelTab &&
        previousSelection.workspaceFingerprint === nextSelection.workspaceFingerprint &&
        previousSelection.selectedThreadId === nextSelection.selectedThreadId &&
        previousSelection.selectedSessionId === nextSelection.selectedSessionId &&
        previousSelection.selectedRunId === nextSelection.selectedRunId
    ) {
        return {
            refetchThreadChrome: false,
            refetchSessionWorkspace: false,
            refetchPlanWorkspace: false,
        };
    }

    // Shell selection changes rely on query keys and runtime events. Manual refetch is reserved for
    // explicit mutation boundaries so thread switching does not turn into refetch storms.
    return {
        refetchThreadChrome: false,
        refetchSessionWorkspace: false,
        refetchPlanWorkspace: false,
    };
}
