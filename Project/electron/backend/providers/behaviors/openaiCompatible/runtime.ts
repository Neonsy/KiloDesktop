import { buildAutoCacheKey } from '@/app/backend/providers/behaviors/cacheKey';
import {
    errProviderBehavior,
    okProviderBehavior,
    type ProviderBilledVia,
    type ProviderRuntimeBehavior,
} from '@/app/backend/providers/behaviors/types';
import type { FirstPartyProviderId } from '@/app/backend/providers/registry';
import type { RuntimeRunOptions } from '@/app/backend/runtime/contracts';

function isReasoningRequested(runtimeOptions: RuntimeRunOptions): boolean {
    return (
        runtimeOptions.reasoning.effort !== 'none' ||
        runtimeOptions.reasoning.summary !== 'none' ||
        runtimeOptions.reasoning.includeEncrypted
    );
}

function resolveCacheKey(input: {
    profileId: string;
    sessionId: string;
    cacheScopeKey?: string;
    modelId: string;
    runtimeOptions: RuntimeRunOptions;
    providerId: FirstPartyProviderId;
}): string {
    if (input.runtimeOptions.cache.strategy === 'manual') {
        return input.runtimeOptions.cache.key ?? '';
    }

    return buildAutoCacheKey({
        profileId: input.profileId,
        scopeKey: input.cacheScopeKey ?? input.sessionId,
        providerId: input.providerId,
        modelId: input.modelId,
    });
}

export function createOpenAICompatibleRuntimeBehavior(input: {
    providerId: FirstPartyProviderId;
    billedViaApiKey: ProviderBilledVia;
    billedViaOAuth: ProviderBilledVia;
}): ProviderRuntimeBehavior {
    return {
        providerId: input.providerId,
        resolveInitialTransport(runtimeOptions) {
            if (runtimeOptions.transport.openai === 'chat') {
                return {
                    requested: runtimeOptions.transport.openai,
                    selected: 'chat_completions',
                    degraded: false,
                };
            }

            return {
                requested: runtimeOptions.transport.openai,
                selected: 'responses',
                degraded: false,
            };
        },
        resolveCache(cacheInput) {
            const key = resolveCacheKey({
                ...cacheInput,
                providerId: input.providerId,
            });
            if (key.trim().length === 0) {
                return errProviderBehavior('cache_key_invalid', 'Cache key resolution failed: cache key is empty.');
            }

            return okProviderBehavior({
                strategy: cacheInput.runtimeOptions.cache.strategy,
                key,
                applied: false,
                reason: 'unsupported_transport',
            });
        },
        validateRunOptions(validationInput) {
            if (
                !validationInput.modelCapabilities.supportsReasoning &&
                isReasoningRequested(validationInput.runtimeOptions)
            ) {
                return errProviderBehavior(
                    'runtime_option_invalid',
                    `Model "${validationInput.modelId}" does not support reasoning options.`
                );
            }

            return okProviderBehavior(undefined);
        },
        resolveBilledVia(authMethod) {
            if (authMethod === 'api_key') {
                return input.billedViaApiKey;
            }

            return input.billedViaOAuth;
        },
    };
}
