import { providerMetadataOrchestrator } from '@/app/backend/providers/metadata/orchestrator';
import type { ProviderServiceResult } from '@/app/backend/providers/service/errors';
import type { ProviderSyncResult } from '@/app/backend/providers/service/types';
import type { RuntimeProviderId } from '@/app/backend/runtime/contracts';

export async function syncCatalog(
    profileId: string,
    providerId: RuntimeProviderId,
    force = false,
    context?: { requestId?: string; correlationId?: string }
): Promise<ProviderServiceResult<ProviderSyncResult>> {
    return providerMetadataOrchestrator.syncCatalog(profileId, providerId, force, context);
}
