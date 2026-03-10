import { describe, expect, it, vi } from 'vitest';

import { submitPrompt } from '@/web/components/conversation/shell/actions/promptSubmit';
import { DEFAULT_RUN_OPTIONS } from '@/web/components/conversation/shell/workspace/helpers';

describe('submitPrompt', () => {
    it('starts plan mode and clears prompt state on success', async () => {
        const startPlan = vi.fn().mockResolvedValue({});
        const onPromptCleared = vi.fn();
        const onPlanRefetch = vi.fn();
        const startRun = vi.fn();

        await submitPrompt({
            prompt: '  Build a plan  ',
            isStartingRun: false,
            selectedSessionId: 'sess_test',
            isPlanningMode: true,
            profileId: 'profile_default',
            topLevelTab: 'agent',
            modeKey: 'plan',
            workspaceFingerprint: 'wsf_test',
            resolvedRunTarget: undefined,
            runtimeOptions: DEFAULT_RUN_OPTIONS,
            providerById: new Map(),
            startPlan,
            startRun,
            onPromptCleared,
            onPlanRefetch,
            onRuntimeRefetch: vi.fn(),
            onError: vi.fn(),
        });

        expect(startPlan).toHaveBeenCalledWith({
            profileId: 'profile_default',
            sessionId: 'sess_test',
            topLevelTab: 'agent',
            modeKey: 'plan',
            prompt: 'Build a plan',
            workspaceFingerprint: 'wsf_test',
        });
        expect(startRun).not.toHaveBeenCalled();
        expect(onPromptCleared).toHaveBeenCalledOnce();
        expect(onPlanRefetch).toHaveBeenCalledOnce();
    });

    it('returns actionable provider auth errors for run mode', async () => {
        const onError = vi.fn();

        await submitPrompt({
            prompt: 'Ship it',
            isStartingRun: false,
            selectedSessionId: 'sess_test',
            isPlanningMode: false,
            profileId: 'profile_default',
            topLevelTab: 'chat',
            modeKey: 'chat',
            workspaceFingerprint: undefined,
            resolvedRunTarget: {
                providerId: 'openai',
                modelId: 'openai/gpt-5',
            },
            runtimeOptions: DEFAULT_RUN_OPTIONS,
            providerById: new Map([
                [
                    'openai',
                    {
                        label: 'OpenAI',
                        authState: 'logged_out',
                        authMethod: 'oauth_pkce',
                    },
                ],
            ]),
            startPlan: vi.fn(),
            startRun: vi.fn(),
            onPromptCleared: vi.fn(),
            onPlanRefetch: vi.fn(),
            onRuntimeRefetch: vi.fn(),
            onError,
        });

        expect(onError).toHaveBeenCalledWith(
            'OpenAI is not authenticated. Open Settings > Providers to connect it before running.'
        );
    });

    it('submits ready image attachments for executable runs', async () => {
        const startRun = vi.fn().mockResolvedValue({});
        const onPromptCleared = vi.fn();
        const onRuntimeRefetch = vi.fn();

        await submitPrompt({
            prompt: '',
            attachments: [
                {
                    clientId: 'img-1',
                    mimeType: 'image/png',
                    bytesBase64: 'abc123',
                    width: 1,
                    height: 1,
                    sha256: 'hash-1',
                },
            ],
            isStartingRun: false,
            selectedSessionId: 'sess_test',
            isPlanningMode: false,
            profileId: 'profile_default',
            topLevelTab: 'chat',
            modeKey: 'chat',
            workspaceFingerprint: undefined,
            resolvedRunTarget: {
                providerId: 'openai',
                modelId: 'openai/gpt-5',
            },
            runtimeOptions: DEFAULT_RUN_OPTIONS,
            providerById: new Map([
                [
                    'openai',
                    {
                        label: 'OpenAI',
                        authState: 'configured',
                        authMethod: 'api_key',
                    },
                ],
            ]),
            startPlan: vi.fn(),
            startRun,
            onPromptCleared,
            onPlanRefetch: vi.fn(),
            onRuntimeRefetch,
            onError: vi.fn(),
        });

        expect(startRun).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: '',
                attachments: [
                    expect.objectContaining({
                        clientId: 'img-1',
                        mimeType: 'image/png',
                    }),
                ],
            })
        );
        expect(onPromptCleared).toHaveBeenCalledOnce();
        expect(onRuntimeRefetch).toHaveBeenCalledOnce();
    });
});
