import { afterEach, describe, expect, it, vi } from 'vitest';

const originalNodeEnv = process.env['NODE_ENV'];
const originalVitestFlag = process.env['VITEST'];

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
    vi.unmock('@/app/backend/secrets/keytarStore');
});

describe('secret store', () => {
    it('supports explicit in-memory injection for tests', async () => {
        const secrets = await import('@/app/backend/secrets/store');
        const injected = new secrets.InMemorySecretStore();
        secrets.initializeSecretStore(injected);

        const store = secrets.getSecretStore();
        await store.set('provider/openai', 'token-value');
        await expect(store.get('provider/openai')).resolves.toBe('token-value');
        await store.delete('provider/openai');
        await expect(store.get('provider/openai')).resolves.toBeNull();

        expect(secrets.getSecretStoreInfo()).toEqual({
            backend: 'memory',
            available: true,
        });
    });

    it('reports unavailable keytar backend with typed runtime errors', async () => {
        process.env['NODE_ENV'] = 'production';
        delete process.env['VITEST'];

        vi.doMock('@/app/backend/secrets/keytarStore', () => {
            class SecretStoreUnavailableError extends Error {
                constructor(reason: string) {
                    super(`Secret store backend unavailable: ${reason}`);
                    this.name = 'SecretStoreUnavailableError';
                }
            }

            return {
                SecretStoreUnavailableError,
                createKeytarSecretStore: () => ({
                    store: {
                        get() {
                            return Promise.reject(new SecretStoreUnavailableError('keychain unavailable'));
                        },
                        set() {
                            return Promise.reject(new SecretStoreUnavailableError('keychain unavailable'));
                        },
                        delete() {
                            return Promise.reject(new SecretStoreUnavailableError('keychain unavailable'));
                        },
                    },
                    info: {
                        backend: 'keytar',
                        available: false,
                        reason: 'keychain unavailable',
                    },
                }),
            };
        });

        const secrets = await import('@/app/backend/secrets/store');
        secrets.initializeSecretStore();

        expect(secrets.getSecretStoreInfo()).toEqual({
            backend: 'keytar',
            available: false,
            reason: 'keychain unavailable',
        });

        await expect(secrets.getSecretStore().get('provider/kilo')).rejects.toThrow(
            'Secret store backend unavailable: keychain unavailable'
        );
    });
});
