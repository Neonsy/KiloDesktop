import { useEffect, useState } from 'react';

import type { TopLevelTab } from '@/shared/contracts';

interface CreateThreadInput {
    scope: 'detached' | 'workspace';
    workspacePath?: string;
    title: string;
}

interface UseConversationSidebarStateInput {
    topLevelTab: TopLevelTab;
    isCreatingThread: boolean;
    workspaceRoots: Array<{ fingerprint: string; absolutePath: string }>;
    preferredWorkspaceFingerprint?: string;
    onCreateThread: (input: CreateThreadInput) => Promise<void>;
}

function modeLabel(topLevelTab: TopLevelTab): string {
    if (topLevelTab === 'chat') {
        return 'Chat';
    }
    if (topLevelTab === 'agent') {
        return 'Agent';
    }
    return 'Orchestrator';
}

export function useConversationSidebarState(input: UseConversationSidebarStateInput) {
    const initialWorkspaceFingerprint = input.preferredWorkspaceFingerprint ?? input.workspaceRoots[0]?.fingerprint;
    const [newThreadTitle, setNewThreadTitle] = useState('');
    const [newThreadScope, setNewThreadScope] = useState<'detached' | 'workspace'>(
        input.topLevelTab === 'chat'
            ? initialWorkspaceFingerprint
                ? 'workspace'
                : 'detached'
            : 'workspace'
    );
    const [newThreadWorkspaceFingerprint, setNewThreadWorkspaceFingerprint] = useState<string | undefined>(
        initialWorkspaceFingerprint
    );

    useEffect(() => {
        if (
            newThreadWorkspaceFingerprint &&
            input.workspaceRoots.some((workspaceRoot) => workspaceRoot.fingerprint === newThreadWorkspaceFingerprint)
        ) {
            return;
        }

        setNewThreadWorkspaceFingerprint(input.preferredWorkspaceFingerprint ?? input.workspaceRoots[0]?.fingerprint);
    }, [input.preferredWorkspaceFingerprint, input.workspaceRoots, newThreadWorkspaceFingerprint]);

    async function createThread(): Promise<void> {
        if (input.isCreatingThread) {
            return;
        }

        const generatedTitle =
            newThreadTitle.trim().length > 0
                ? newThreadTitle.trim()
                : `New ${modeLabel(input.topLevelTab).toLowerCase()} thread`;
        const selectedWorkspace = newThreadWorkspaceFingerprint
            ? input.workspaceRoots.find((workspaceRoot) => workspaceRoot.fingerprint === newThreadWorkspaceFingerprint)
            : undefined;

        if (newThreadScope === 'workspace' && !selectedWorkspace?.absolutePath) {
            return;
        }
        if (newThreadScope === 'detached' && input.topLevelTab !== 'chat') {
            return;
        }

        await input.onCreateThread({
            scope: newThreadScope,
            title: generatedTitle,
            ...(newThreadScope === 'workspace' && selectedWorkspace?.absolutePath
                ? { workspacePath: selectedWorkspace.absolutePath }
                : {}),
        });
        setNewThreadTitle('');
    }

    return {
        newThreadTitle,
        setNewThreadTitle,
        newThreadScope,
        setNewThreadScope,
        newThreadWorkspaceFingerprint,
        setNewThreadWorkspaceFingerprint,
        createThread,
    };
}

