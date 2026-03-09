import { useEffect } from 'react';

import type { ThreadListRecord, ThreadTagRecord } from '@/app/backend/persistence/types';

interface UseThreadSidebarStateInput {
    threads: ThreadListRecord[];
    threadTags: ThreadTagRecord[];
    selectedTagIds: string[];
    selectedThreadId: string | undefined;
    onSelectedThreadInvalid: () => void;
    onSelectFallbackThread: (threadId: string) => void;
}

export interface ThreadSidebarState {
    threadTagIdsByThread: Map<string, string[]>;
    visibleThreads: ThreadListRecord[];
}

export function filterThreadsBySelectedTagIds(input: {
    threads: ThreadListRecord[];
    threadTagIdsByThread: Map<string, string[]>;
    selectedTagIds: string[];
}): ThreadListRecord[] {
    if (input.selectedTagIds.length === 0) {
        return input.threads;
    }

    return input.threads.filter((thread) => {
        const tagIds = new Set(input.threadTagIdsByThread.get(thread.id) ?? []);
        return input.selectedTagIds.every((tagId) => tagIds.has(tagId));
    });
}

export function useThreadSidebarState(input: UseThreadSidebarStateInput): ThreadSidebarState {
    const threadTagIdsByThread = new Map<string, string[]>();
    for (const relation of input.threadTags) {
        const existing = threadTagIdsByThread.get(relation.threadId) ?? [];
        existing.push(relation.tagId);
        threadTagIdsByThread.set(relation.threadId, existing);
    }

    const visibleThreads = filterThreadsBySelectedTagIds({
        threads: input.threads,
        threadTagIdsByThread,
        selectedTagIds: input.selectedTagIds,
    });

    useEffect(() => {
        if (visibleThreads.length === 0) {
            input.onSelectedThreadInvalid();
            return;
        }

        if (input.selectedThreadId && visibleThreads.some((thread) => thread.id === input.selectedThreadId)) {
            return;
        }

        const firstVisibleThread = visibleThreads.at(0);
        if (firstVisibleThread) {
            input.onSelectFallbackThread(firstVisibleThread.id);
        }
    }, [input.onSelectFallbackThread, input.onSelectedThreadInvalid, input.selectedThreadId, visibleThreads]);

    return {
        threadTagIdsByThread,
        visibleThreads,
    };
}
