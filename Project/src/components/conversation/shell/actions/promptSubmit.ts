import {
    isEntityId,
    isProviderRunnable,
    toActionableRunError,
    type RunTargetSelection,
} from '@/web/components/conversation/shell/workspace/helpers';

import type { RuntimeRunOptions } from '@/app/backend/runtime/contracts';
import type {
    ComposerImageAttachmentInput,
    EntityId,
    PlanStartInput,
    SessionStartRunInput,
    RuntimeProviderId,
    TopLevelTab,
} from '@/app/backend/runtime/contracts';

interface ProviderAuthView {
    label: string;
    authState: string;
    authMethod: string;
}

interface SubmitPromptInput {
    prompt: string;
    attachments?: ComposerImageAttachmentInput[];
    isStartingRun: boolean;
    selectedSessionId: string | undefined;
    isPlanningMode: boolean;
    profileId: string;
    topLevelTab: TopLevelTab;
    modeKey: string;
    workspaceFingerprint: string | undefined;
    worktreeId?: EntityId<'wt'>;
    resolvedRunTarget: RunTargetSelection | undefined;
    runtimeOptions: RuntimeRunOptions;
    providerById: Map<RuntimeProviderId, ProviderAuthView>;
    startPlan: (input: PlanStartInput) => Promise<unknown>;
    startRun: (input: SessionStartRunInput) => Promise<unknown>;
    onPromptCleared: () => void;
    onPlanRefetch: () => void;
    onRuntimeRefetch: () => void;
    onError: (message: string) => void;
}

export async function submitPrompt(input: SubmitPromptInput): Promise<void> {
    const trimmedPrompt = input.prompt.trim();
    const attachments = input.attachments ?? [];
    if ((trimmedPrompt.length === 0 && attachments.length === 0) || input.isStartingRun) {
        return;
    }

    if (!isEntityId(input.selectedSessionId, 'sess')) {
        return;
    }

    if (input.isPlanningMode) {
        if (trimmedPrompt.length === 0) {
            input.onError('Planning runs require a text prompt.');
            return;
        }

        try {
            await input.startPlan({
                profileId: input.profileId,
                sessionId: input.selectedSessionId,
                topLevelTab: input.topLevelTab,
                modeKey: input.modeKey,
                prompt: trimmedPrompt,
                ...(input.workspaceFingerprint ? { workspaceFingerprint: input.workspaceFingerprint } : {}),
            });
            input.onPromptCleared();
            input.onPlanRefetch();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            input.onError(`Plan start failed: ${message}`);
        }
        return;
    }

    if (!input.resolvedRunTarget) {
        input.onError('No runnable provider/model found. Open Settings > Providers to configure one.');
        return;
    }

    const selectedProvider = input.providerById.get(input.resolvedRunTarget.providerId);
    if (selectedProvider && !isProviderRunnable(selectedProvider.authState, selectedProvider.authMethod)) {
        input.onError(
            `${selectedProvider.label} is not authenticated. Open Settings > Providers to connect it before running.`
        );
        return;
    }

    try {
        await input.startRun({
            profileId: input.profileId,
            sessionId: input.selectedSessionId,
            prompt: trimmedPrompt,
            topLevelTab: input.topLevelTab,
            modeKey: input.modeKey,
            providerId: input.resolvedRunTarget.providerId,
            modelId: input.resolvedRunTarget.modelId,
            ...(attachments.length > 0 ? { attachments } : {}),
            ...(input.workspaceFingerprint ? { workspaceFingerprint: input.workspaceFingerprint } : {}),
            ...(input.worktreeId ? { worktreeId: input.worktreeId } : {}),
            runtimeOptions: input.runtimeOptions,
        });
        input.onPromptCleared();
        input.onRuntimeRefetch();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const providerLabel = selectedProvider?.label ?? input.resolvedRunTarget.providerId;
        input.onError(toActionableRunError(message, providerLabel));
    }
}
