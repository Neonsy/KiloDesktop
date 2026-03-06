import { copyProfileParityRows } from '@/app/backend/persistence/stores/profileStoreHelpers/parity';
import { initializeProfileProviderBaseline } from '@/app/backend/persistence/stores/profileStoreHelpers/providers';
import { copyProfileSettings } from '@/app/backend/persistence/stores/profileStoreHelpers/settings';
import type { ProfileStoreDb } from '@/app/backend/persistence/stores/profileStoreHelpers/types';

export async function initializeProfileBaseline(
    tx: ProfileStoreDb,
    targetProfileId: string,
    templateProfileId: string,
    options: {
        copyAllSettings: boolean;
        timestamp: string;
    }
): Promise<void> {
    await copyProfileParityRows({
        tx,
        sourceProfileId: templateProfileId,
        targetProfileId,
        timestamp: options.timestamp,
    });
    await initializeProfileProviderBaseline({
        tx,
        sourceProfileId: templateProfileId,
        targetProfileId,
        timestamp: options.timestamp,
    });
    await copyProfileSettings({
        tx,
        sourceProfileId: templateProfileId,
        targetProfileId,
        timestamp: options.timestamp,
        copyAllSettings: options.copyAllSettings,
    });
}
