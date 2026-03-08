import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDefaultProfileId, resetPersistenceForTests } from '@/app/backend/persistence/db';
import { profileStore } from '@/app/backend/persistence/stores';
import { errProfileStore } from '@/app/backend/persistence/stores/profile/profileStoreErrors';
import { runtimeSnapshotService } from '@/app/backend/runtime/services/runtimeSnapshot';

describe('runtimeSnapshot service', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        resetPersistenceForTests();
    });

    it('returns a typed not_found error when the active profile lookup is missing', async () => {
        const missingActiveProfileResult = errProfileStore('Active profile is missing for diagnostic snapshot.');
        missingActiveProfileResult.match(
            () => undefined,
            () => undefined
        );
        vi.spyOn(profileStore, 'getActive').mockResolvedValue(missingActiveProfileResult);

        const result = await runtimeSnapshotService.getSnapshot(getDefaultProfileId());

        expect(result.isErr()).toBe(true);
        if (result.isOk()) {
            throw new Error('Expected diagnostic snapshot to fail when the active profile is missing.');
        }

        expect(result.error.code).toBe('not_found');
        expect(result.error.message).toContain('Active profile is missing');
    });
});
