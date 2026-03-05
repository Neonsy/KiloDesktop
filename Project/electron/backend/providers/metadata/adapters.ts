import { syncKiloCatalog } from '@/app/backend/providers/adapters/kilo/catalog';
import { syncStaticCatalog } from '@/app/backend/providers/metadata/staticCatalog/adapter';
import { assertSupportedProviderId } from '@/app/backend/providers/registry';
import type { FirstPartyProviderId } from '@/app/backend/providers/registry';
import type { ProviderMetadataAdapter } from '@/app/backend/providers/types';

const kiloMetadataAdapter: ProviderMetadataAdapter = {
    id: 'kilo',
    fetchCatalog(input) {
        return syncKiloCatalog(input);
    },
};

const openAIStaticMetadataAdapter: ProviderMetadataAdapter = {
    id: 'openai',
    fetchCatalog(input) {
        return syncStaticCatalog('openai', input);
    },
};

const zaiStaticMetadataAdapter: ProviderMetadataAdapter = {
    id: 'zai',
    fetchCatalog(input) {
        return syncStaticCatalog('zai', input);
    },
};

const moonshotStaticMetadataAdapter: ProviderMetadataAdapter = {
    id: 'moonshot',
    fetchCatalog(input) {
        return syncStaticCatalog('moonshot', input);
    },
};

const metadataAdapters: Record<FirstPartyProviderId, ProviderMetadataAdapter> = {
    kilo: kiloMetadataAdapter,
    openai: openAIStaticMetadataAdapter,
    zai: zaiStaticMetadataAdapter,
    moonshot: moonshotStaticMetadataAdapter,
};

export function getProviderMetadataAdapter(providerId: FirstPartyProviderId): ProviderMetadataAdapter {
    const supportedProviderId = assertSupportedProviderId(providerId);
    return metadataAdapters[supportedProviderId];
}
