import { useEffect } from 'react';

import type { ConversationUiState } from '@/web/components/conversation/hooks/useConversationUiState';

import type { ConversationRecord, TagRecord, ThreadListRecord } from '@/app/backend/persistence/types';

interface ConversationSyncInput {
    profileId: string;
    uiState: ConversationUiState;
    threads: {
        sort?: 'latest' | 'alphabetical';
        showAllModes?: boolean;
        groupView?: 'workspace' | 'branch';
        threads: ThreadListRecord[];
    } | undefined;
    tags: TagRecord[] | undefined;
    buckets: ConversationRecord[] | undefined;
    onProfileReset: () => void;
}

export function useConversationSync(input: ConversationSyncInput): void {
    useEffect(() => {
        input.onProfileReset();
    }, [input.onProfileReset, input.profileId]);

    useEffect(() => {
        if (input.uiState.sort || !input.threads?.sort) {
            return;
        }

        input.uiState.setSort(input.threads.sort);
    }, [input.threads?.sort, input.uiState]);

    useEffect(() => {
        if (input.threads?.showAllModes === undefined) {
            return;
        }
        if (input.uiState.showAllModes === input.threads.showAllModes) {
            return;
        }
        input.uiState.setShowAllModes(input.threads.showAllModes);
    }, [input.threads?.showAllModes, input.uiState]);

    useEffect(() => {
        const nextGroupView = input.threads?.groupView;
        if (!nextGroupView) {
            return;
        }
        if (input.uiState.groupView === nextGroupView) {
            return;
        }
        input.uiState.setGroupView(nextGroupView);
    }, [input.threads?.groupView, input.uiState]);

    useEffect(() => {
        const selectedTagIds = input.uiState.selectedTagIds;
        if (selectedTagIds.length === 0) {
            return;
        }

        const availableTagIds = new Set((input.tags ?? []).map((tag) => tag.id));
        const nextSelectedTagIds = selectedTagIds.filter((tagId) => availableTagIds.has(tagId));
        if (nextSelectedTagIds.length !== selectedTagIds.length) {
            input.uiState.setSelectedTagIds(nextSelectedTagIds);
        }
    }, [input.tags, input.uiState]);

    useEffect(() => {
        const workspaceFilter = input.uiState.workspaceFilter;
        if (!workspaceFilter) {
            return;
        }

        const workspaceExists = (input.buckets ?? [])
            .filter((bucket) => bucket.scope === 'workspace')
            .some((bucket) => bucket.workspaceFingerprint === workspaceFilter);
        if (!workspaceExists) {
            input.uiState.setWorkspaceFilter(undefined);
        }
    }, [input.buckets, input.uiState]);
}
