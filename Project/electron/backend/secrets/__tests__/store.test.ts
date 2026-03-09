import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultProfileId, resetPersistenceForTests } from '@/app/backend/persistence/db';

const originalNodeEnv = process.env['NODE_ENV'];
const originalVitestFlag = process.env['VITEST'];

describe('secret store', () => {
    beforeEach(() => {
        resetPersistenceForTests();
    });

    afterEach(() => {
        if (originalNodeEnv === undefined) {
            delete process.env['NODE_ENV'];
        } else {
            process.env['NODE_ENV'] = originalNodeEnv;
        }

        if (originalVitestFlag === undefined) {
            delete process.env['VITEST'];
        } else {
            process.env['VITEST'] = originalVitestFlag;
        }

        vi.resetModules();
    });

    it('supports explicit in-memory injection for tests', async () => {
        const { InMemorySecretStore, getSecretStore, getSecretStoreInfo, initializeSecretStore } = await import(
            '@/app/backend/secrets/store'
        );
        const injectedStore = new InMemorySecretStore();
        initializeSecretStore(injectedStore);

        const secretStore = getSecretStore();
        await secretStore.set('provider/profile_test/openai/api_key', 'token-value');
        await expect(secretStore.get('provider/profile_test/openai/api_key')).resolves.toBe('token-value');
        await secretStore.delete('provider/profile_test/openai/api_key');
        await expect(secretStore.get('provider/profile_test/openai/api_key')).resolves.toBeNull();

        expect(getSecretStoreInfo()).toEqual({
            backend: 'memory',
            available: true,
        });
    });

    it('uses database-backed provider secrets outside test runtime injection', async () => {
        process.env['NODE_ENV'] = 'production';
        delete process.env['VITEST'];

        vi.resetModules();
        const { providerSecretStore } = await import('@/app/backend/persistence/stores');
        const { getSecretStore, getSecretStoreInfo, initializeSecretStore } = await import('@/app/backend/secrets/store');
        const profileId = getDefaultProfileId();
        initializeSecretStore();

        expect(getSecretStoreInfo()).toEqual({
            backend: 'database',
            available: true,
        });

        const secretStore = getSecretStore();
        await secretStore.set(`provider/${profileId}/openai/api_key`, 'database-token');

        await expect(secretStore.get(`provider/${profileId}/openai/api_key`)).resolves.toBe('database-token');
        await expect(providerSecretStore.getValue(profileId, 'openai', 'api_key')).resolves.toBe('database-token');

        await secretStore.delete(`provider/${profileId}/openai/api_key`);
        await expect(providerSecretStore.getValue(profileId, 'openai', 'api_key')).resolves.toBeNull();
    });

    it('rejects invalid provider secret keys without mutating the database store', async () => {
        process.env['NODE_ENV'] = 'production';
        delete process.env['VITEST'];

        vi.resetModules();
        const { providerSecretStore } = await import('@/app/backend/persistence/stores');
        const { getSecretStore, initializeSecretStore } = await import('@/app/backend/secrets/store');
        const profileId = getDefaultProfileId();
        initializeSecretStore();

        const secretStore = getSecretStore();
        await expect(secretStore.get(`provider/${profileId}/unsupported/api_key`)).resolves.toBeNull();
        await expect(secretStore.set(`provider/${profileId}/unsupported/api_key`, 'ignored')).resolves.toBeUndefined();
        await expect(secretStore.delete(`provider/${profileId}/unsupported/api_key`)).resolves.toBeUndefined();
        await expect(providerSecretStore.getValue(profileId, 'openai', 'api_key')).resolves.toBeNull();
    });
});
