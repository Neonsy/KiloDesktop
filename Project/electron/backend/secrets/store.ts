import { providerSecretStore } from '@/app/backend/persistence/stores';
import { tryParseProviderSecretKey } from '@/app/backend/secrets/providerSecretKeys';
import { appLog } from '@/app/main/logging';

export interface SecretStore {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
}

export interface SecretStoreInfo {
    backend: 'database' | 'memory';
    available: boolean;
}

export class InMemorySecretStore implements SecretStore {
    private readonly data = new Map<string, string>();

    get(key: string): Promise<string | null> {
        return Promise.resolve(this.data.get(key) ?? null);
    }

    set(key: string, value: string): Promise<void> {
        this.data.set(key, value);
        return Promise.resolve();
    }

    delete(key: string): Promise<void> {
        this.data.delete(key);
        return Promise.resolve();
    }
}

class DatabaseSecretStore implements SecretStore {
    private tryResolveSecretKey(key: string, operation: 'get' | 'set' | 'delete') {
        const parsedSecretKey = tryParseProviderSecretKey(key);
        if (parsedSecretKey) {
            return parsedSecretKey;
        }

        appLog.warn({
            tag: 'secrets.store',
            message: 'Rejected invalid provider secret key.',
            key,
            operation,
        });
        return null;
    }

    async get(key: string): Promise<string | null> {
        const parsedSecretKey = this.tryResolveSecretKey(key, 'get');
        if (!parsedSecretKey) {
            return null;
        }

        return providerSecretStore.getValue(
            parsedSecretKey.profileId,
            parsedSecretKey.providerId,
            parsedSecretKey.secretKind
        );
    }

    async set(key: string, value: string): Promise<void> {
        const parsedSecretKey = this.tryResolveSecretKey(key, 'set');
        if (!parsedSecretKey) {
            return;
        }

        await providerSecretStore.upsertValue({
            profileId: parsedSecretKey.profileId,
            providerId: parsedSecretKey.providerId,
            secretKind: parsedSecretKey.secretKind,
            secretValue: value,
        });
    }

    async delete(key: string): Promise<void> {
        const parsedSecretKey = this.tryResolveSecretKey(key, 'delete');
        if (!parsedSecretKey) {
            return;
        }

        await providerSecretStore.deleteByProfileProviderAndKind(
            parsedSecretKey.profileId,
            parsedSecretKey.providerId,
            parsedSecretKey.secretKind
        );
    }
}

let store: SecretStore = new InMemorySecretStore();
let storeInfo: SecretStoreInfo = {
    backend: 'memory',
    available: true,
};

export function getSecretStore(): SecretStore {
    return store;
}

export function getSecretStoreInfo(): SecretStoreInfo {
    return storeInfo;
}

export function initializeSecretStore(nextStore?: SecretStore): SecretStore {
    if (nextStore) {
        store = nextStore;
        storeInfo = {
            backend: 'memory',
            available: true,
        };
        appLog.debug({
            tag: 'secrets.store',
            message: 'Initialized override secret store.',
            backend: storeInfo.backend,
        });
        return store;
    }

    store = new DatabaseSecretStore();
    storeInfo = {
        backend: 'database',
        available: true,
    };
    appLog.info({
        tag: 'secrets.store',
        message: 'Initialized database-backed secret store.',
        backend: storeInfo.backend,
    });

    return store;
}
