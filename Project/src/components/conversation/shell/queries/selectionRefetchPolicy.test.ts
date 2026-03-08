import { describe, expect, it } from 'vitest';

import { buildConversationSelectionRefetchPolicy } from '@/web/components/conversation/shell/queries/selectionRefetchPolicy';

describe('selection refetch policy', () => {
    it('does not request manual refetches when switching across threads in the same workspace', () => {
        const workspaceFingerprint = 'ws_demo';
        const transitions = [
            {
                previousSelection: {
                    profileId: 'profile_default',
                    topLevelTab: 'agent' as const,
                    workspaceFingerprint,
                    selectedThreadId: 'thr_one',
                    selectedSessionId: 'sess_one',
                    selectedRunId: 'run_one',
                },
                nextSelection: {
                    profileId: 'profile_default',
                    topLevelTab: 'agent' as const,
                    workspaceFingerprint,
                    selectedThreadId: 'thr_two',
                    selectedSessionId: 'sess_two',
                    selectedRunId: 'run_two',
                },
            },
            {
                previousSelection: {
                    profileId: 'profile_default',
                    topLevelTab: 'agent' as const,
                    workspaceFingerprint,
                    selectedThreadId: 'thr_two',
                    selectedSessionId: 'sess_two',
                    selectedRunId: 'run_two',
                },
                nextSelection: {
                    profileId: 'profile_default',
                    topLevelTab: 'agent' as const,
                    workspaceFingerprint,
                    selectedThreadId: 'thr_three',
                    selectedSessionId: 'sess_three',
                    selectedRunId: 'run_three',
                },
            },
        ];

        for (const transition of transitions) {
            expect(
                buildConversationSelectionRefetchPolicy(
                    transition.previousSelection,
                    transition.nextSelection
                )
            ).toEqual({
                refetchThreadChrome: false,
                refetchSessionWorkspace: false,
                refetchPlanWorkspace: false,
            });
        }
    });
});
