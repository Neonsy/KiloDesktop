import { streamMoonshotRuntime } from '@/app/backend/providers/adapters/moonshot/runtime';
import { syncStaticCatalog } from '@/app/backend/providers/metadata/staticCatalog/adapter';
import type {
    ProviderAdapter,
    ProviderAdapterResult,
    ProviderCatalogSyncResult,
    ProviderRuntimeHandlers,
    ProviderRuntimeInput,
} from '@/app/backend/providers/types';

export class MoonshotProviderAdapter implements ProviderAdapter {
    readonly id = 'moonshot' as const;

    async syncCatalog(input: {
        profileId: string;
        authMethod: 'none' | 'api_key' | 'device_code' | 'oauth_pkce' | 'oauth_device';
        apiKey?: string;
        accessToken?: string;
        organizationId?: string;
        force?: boolean;
    }): Promise<ProviderCatalogSyncResult> {
        return syncStaticCatalog('moonshot', input);
    }

    async streamCompletion(
        input: ProviderRuntimeInput,
        handlers: ProviderRuntimeHandlers
    ): Promise<ProviderAdapterResult<void>> {
        return streamMoonshotRuntime(input, handlers);
    }
}

export const moonshotProviderAdapter = new MoonshotProviderAdapter();
