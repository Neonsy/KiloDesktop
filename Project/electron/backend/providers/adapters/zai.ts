import { streamZaiRuntime } from '@/app/backend/providers/adapters/zai/runtime';
import { syncStaticCatalog } from '@/app/backend/providers/metadata/staticCatalog/adapter';
import type {
    ProviderAdapter,
    ProviderAdapterResult,
    ProviderCatalogSyncResult,
    ProviderRuntimeHandlers,
    ProviderRuntimeInput,
} from '@/app/backend/providers/types';

export class ZaiProviderAdapter implements ProviderAdapter {
    readonly id = 'zai' as const;

    async syncCatalog(input: {
        profileId: string;
        authMethod: 'none' | 'api_key' | 'device_code' | 'oauth_pkce' | 'oauth_device';
        apiKey?: string;
        accessToken?: string;
        organizationId?: string;
        force?: boolean;
    }): Promise<ProviderCatalogSyncResult> {
        return syncStaticCatalog('zai', input);
    }

    async streamCompletion(
        input: ProviderRuntimeInput,
        handlers: ProviderRuntimeHandlers
    ): Promise<ProviderAdapterResult<void>> {
        return streamZaiRuntime(input, handlers);
    }
}

export const zaiProviderAdapter = new ZaiProviderAdapter();
