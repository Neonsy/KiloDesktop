import { providerMetadataOrchestrator } from '@/app/backend/providers/metadata/orchestrator';
import type { ProviderSyncResult } from '@/app/backend/providers/service/types';
import type { RuntimeProviderId } from '@/app/backend/runtime/contracts';

export async function syncCatalog(
    profileId: string,
    providerId: RuntimeProviderId,
    force = false
): Promise<ProviderSyncResult> {
    return providerMetadataOrchestrator.syncCatalog(profileId, providerId, force);
}
