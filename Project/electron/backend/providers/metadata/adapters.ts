import { syncKiloCatalog } from '@/app/backend/providers/adapters/kilo/catalog';
import { syncOpenAICatalog } from '@/app/backend/providers/adapters/openai/catalog';
import { assertSupportedProviderId } from '@/app/backend/providers/registry';
import type { FirstPartyProviderId } from '@/app/backend/providers/registry';
import type { ProviderMetadataAdapter } from '@/app/backend/providers/types';

const kiloMetadataAdapter: ProviderMetadataAdapter = {
    id: 'kilo',
    fetchCatalog(input) {
        return syncKiloCatalog(input);
    },
};

const openAIMetadataAdapter: ProviderMetadataAdapter = {
    id: 'openai',
    fetchCatalog(input) {
        return syncOpenAICatalog({
            authMethod: input.authMethod,
            ...(input.apiKey ? { apiKey: input.apiKey } : {}),
        });
    },
};

const metadataAdapters: Record<FirstPartyProviderId, ProviderMetadataAdapter> = {
    kilo: kiloMetadataAdapter,
    openai: openAIMetadataAdapter,
};

export function getProviderMetadataAdapter(providerId: FirstPartyProviderId): ProviderMetadataAdapter {
    const supportedProviderId = assertSupportedProviderId(providerId);
    return metadataAdapters[supportedProviderId];
}
