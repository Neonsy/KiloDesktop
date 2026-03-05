import { streamOpenAIRuntime } from '@/app/backend/providers/adapters/openai/runtime';
import { syncStaticCatalog } from '@/app/backend/providers/metadata/staticCatalog/adapter';
import type {
    ProviderAdapter,
    ProviderAdapterResult,
    ProviderCatalogSyncResult,
    ProviderRuntimeHandlers,
    ProviderRuntimeInput,
} from '@/app/backend/providers/types';

export class OpenAIProviderAdapter implements ProviderAdapter {
    readonly id = 'openai' as const;

    async syncCatalog(input: {
        profileId: string;
        authMethod: 'none' | 'api_key' | 'device_code' | 'oauth_pkce' | 'oauth_device';
        apiKey?: string;
        accessToken?: string;
        organizationId?: string;
        force?: boolean;
    }): Promise<ProviderCatalogSyncResult> {
        return syncStaticCatalog('openai', input);
    }

    async streamCompletion(
        input: ProviderRuntimeInput,
        handlers: ProviderRuntimeHandlers
    ): Promise<ProviderAdapterResult<void>> {
        return streamOpenAIRuntime(input, handlers);
    }
}

export const openAIProviderAdapter = new OpenAIProviderAdapter();
