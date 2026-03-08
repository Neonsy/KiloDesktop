import { beforeEach } from 'vitest';

import { getDefaultProfileId, getPersistence, resetPersistenceForTests } from '@/app/backend/persistence/db';
import {
    accountSnapshotStore,
    checkpointStore,
    conversationStore,
    diffStore,
    marketplaceStore,
    mcpStore,
    modeStore,
    permissionStore,
    profileStore,
    providerCatalogStore,
    providerStore,
    runStore,
    runUsageStore,
    secretReferenceStore,
    sessionStore,
    skillfileStore,
    tagStore,
    threadStore,
    toolStore,
} from '@/app/backend/persistence/stores';
import { sessionHistoryService } from '@/app/backend/runtime/services/sessionHistory/service';

export function registerPersistenceStoreHooks() {
    beforeEach(() => {
        resetPersistenceForTests();
    });
}

export const persistenceStoreProfileId = getDefaultProfileId();

export {
    accountSnapshotStore,
    checkpointStore,
    conversationStore,
    diffStore,
    getDefaultProfileId,
    getPersistence,
    marketplaceStore,
    mcpStore,
    modeStore,
    permissionStore,
    profileStore,
    providerCatalogStore,
    providerStore,
    runStore,
    runUsageStore,
    secretReferenceStore,
    sessionHistoryService,
    sessionStore,
    skillfileStore,
    tagStore,
    threadStore,
    toolStore,
};
