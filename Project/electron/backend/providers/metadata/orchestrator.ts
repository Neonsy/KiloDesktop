import { providerCatalogStore, providerStore } from '@/app/backend/persistence/stores';
import type { ProviderModelRecord } from '@/app/backend/persistence/types';
import { getProviderMetadataAdapter } from '@/app/backend/providers/metadata/adapters';
import { normalizeCatalogMetadata, toProviderCatalogUpsert } from '@/app/backend/providers/metadata/normalize';
import { providerAuthExecutionService } from '@/app/backend/providers/providerAuthExecutionService';
import { toProviderServiceException } from '@/app/backend/providers/service/errors';
import { ensureSupportedProvider, resolveSecret } from '@/app/backend/providers/service/helpers';
import type { ProviderSyncResult } from '@/app/backend/providers/service/types';
import type { RuntimeProviderId } from '@/app/backend/runtime/contracts';
import { appLog } from '@/app/main/logging';

const DEFAULT_METADATA_CACHE_TTL_MS = 5 * 60 * 1000;

interface ProviderMetadataCacheEntry {
    loadedAtMs: number;
    models: ProviderModelRecord[];
}

function readMetadataCacheTtlMs(): number {
    const raw = process.env['PROVIDER_METADATA_CACHE_TTL_MS'];
    if (!raw) {
        return DEFAULT_METADATA_CACHE_TTL_MS;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_METADATA_CACHE_TTL_MS;
    }

    return parsed;
}

function buildCacheKey(profileId: string, providerId: RuntimeProviderId): string {
    return `${profileId}:${providerId}`;
}

export class ProviderMetadataOrchestrator {
    private readonly metadataCacheTtlMs = readMetadataCacheTtlMs();
    private readonly cache = new Map<string, ProviderMetadataCacheEntry>();
    private readonly refreshInFlight = new Map<string, Promise<ProviderSyncResult>>();

    async listModels(profileId: string, providerId: RuntimeProviderId): Promise<ProviderModelRecord[]> {
        const ensuredProviderResult = await ensureSupportedProvider(providerId);
        if (ensuredProviderResult.isErr()) {
            throw toProviderServiceException(ensuredProviderResult.error);
        }

        const supportedProviderId = ensuredProviderResult.value;
        const key = buildCacheKey(profileId, supportedProviderId);
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached && now - cached.loadedAtMs <= this.metadataCacheTtlMs) {
            return cached.models;
        }

        const persistedModels = await providerStore.listModels(profileId, supportedProviderId);
        this.cache.set(key, {
            loadedAtMs: now,
            models: persistedModels,
        });
        this.scheduleBackgroundRefresh(profileId, supportedProviderId);

        return persistedModels;
    }

    async listModelsByProfile(profileId: string): Promise<ProviderModelRecord[]> {
        const models = await providerStore.listModelsByProfile(profileId);
        const now = Date.now();
        const byProvider = new Map<RuntimeProviderId, ProviderModelRecord[]>();

        for (const model of models) {
            const existing = byProvider.get(model.providerId) ?? [];
            existing.push(model);
            byProvider.set(model.providerId, existing);
        }

        for (const [providerId, providerModels] of byProvider.entries()) {
            this.cache.set(buildCacheKey(profileId, providerId), {
                loadedAtMs: now,
                models: providerModels,
            });
        }

        return models;
    }

    async syncCatalog(profileId: string, providerId: RuntimeProviderId, force = false): Promise<ProviderSyncResult> {
        const ensuredProviderResult = await ensureSupportedProvider(providerId);
        if (ensuredProviderResult.isErr()) {
            appLog.warn({
                tag: 'provider.metadata-orchestrator',
                message: 'Catalog sync rejected for unsupported provider.',
                profileId,
                providerId,
                reason: ensuredProviderResult.error.code,
                error: ensuredProviderResult.error.message,
            });
            throw toProviderServiceException(ensuredProviderResult.error);
        }

        const supportedProviderId = ensuredProviderResult.value;
        return this.syncSupportedCatalog(profileId, supportedProviderId, force, force ? 'manual_force' : 'manual');
    }

    private scheduleBackgroundRefresh(profileId: string, providerId: RuntimeProviderId): void {
        const key = buildCacheKey(profileId, providerId);
        if (this.refreshInFlight.has(key)) {
            return;
        }

        void this.syncSupportedCatalog(profileId, providerId, false, 'background').catch((error: unknown) => {
            appLog.warn({
                tag: 'provider.metadata-orchestrator',
                message: 'Background provider metadata refresh failed.',
                profileId,
                providerId,
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }

    private async syncSupportedCatalog(
        profileId: string,
        providerId: RuntimeProviderId,
        force: boolean,
        reason: 'manual' | 'manual_force' | 'background'
    ): Promise<ProviderSyncResult> {
        const key = buildCacheKey(profileId, providerId);
        const inFlight = this.refreshInFlight.get(key);
        if (inFlight) {
            return inFlight;
        }

        const refreshPromise = this.executeSync(profileId, providerId, force, reason);
        this.refreshInFlight.set(key, refreshPromise);
        try {
            return await refreshPromise;
        } finally {
            this.refreshInFlight.delete(key);
        }
    }

    private async executeSync(
        profileId: string,
        providerId: RuntimeProviderId,
        force: boolean,
        reason: 'manual' | 'manual_force' | 'background'
    ): Promise<ProviderSyncResult> {
        appLog.info({
            tag: 'provider.metadata-orchestrator',
            message: 'Starting provider metadata sync.',
            profileId,
            providerId,
            force,
            reason,
        });

        const adapter = getProviderMetadataAdapter(providerId);
        const authState = await providerAuthExecutionService.getAuthState(profileId, providerId);
        const [apiKey, accessToken] = await Promise.all([
            resolveSecret(profileId, providerId, 'api_key'),
            resolveSecret(profileId, providerId, 'access_token'),
        ]);

        const fetchResult = await adapter.fetchCatalog({
            profileId,
            authMethod: authState.authMethod,
            ...(apiKey ? { apiKey } : {}),
            ...(accessToken ? { accessToken } : {}),
            ...(authState.organizationId ? { organizationId: authState.organizationId } : {}),
            ...(force ? { force: true } : {}),
        });

        if (!fetchResult.ok) {
            await providerCatalogStore.upsertDiscoverySnapshot({
                profileId,
                providerId,
                kind: 'models',
                payload: { reason: fetchResult.reason, detail: fetchResult.detail ?? null },
                status: 'error',
            });

            appLog.warn({
                tag: 'provider.metadata-orchestrator',
                message: 'Provider metadata sync failed.',
                profileId,
                providerId,
                reason: fetchResult.reason,
                detail: fetchResult.detail ?? null,
            });

            return {
                ok: false,
                status: 'error',
                providerId,
                reason: fetchResult.reason,
                ...(fetchResult.detail ? { detail: fetchResult.detail } : {}),
                modelCount: 0,
            };
        }

        const normalized = normalizeCatalogMetadata(providerId, fetchResult.models);
        if (normalized.droppedCount > 0) {
            appLog.warn({
                tag: 'provider.metadata-orchestrator',
                message: 'Dropped invalid provider metadata rows during normalization.',
                profileId,
                providerId,
                droppedCount: normalized.droppedCount,
            });
        }

        const replaceResult = await providerCatalogStore.replaceModels(
            profileId,
            providerId,
            normalized.models.map(toProviderCatalogUpsert)
        );

        await Promise.all([
            providerCatalogStore.upsertDiscoverySnapshot({
                profileId,
                providerId,
                kind: 'models',
                payload: fetchResult.modelPayload,
                status: 'ok',
            }),
            providerCatalogStore.upsertDiscoverySnapshot({
                profileId,
                providerId,
                kind: 'providers',
                payload: fetchResult.providerPayload,
                status: 'ok',
            }),
        ]);

        const persistedModels = await providerStore.listModels(profileId, providerId);
        this.cache.set(buildCacheKey(profileId, providerId), {
            loadedAtMs: Date.now(),
            models: persistedModels,
        });

        appLog.info({
            tag: 'provider.metadata-orchestrator',
            message: 'Provider metadata sync completed.',
            profileId,
            providerId,
            status: replaceResult.changed ? 'synced' : 'unchanged',
            modelCount: replaceResult.modelCount,
            overrideCount: normalized.overrideCount,
            derivedCount: normalized.derivedCount,
            droppedCount: normalized.droppedCount,
        });

        return {
            ok: true,
            status: replaceResult.changed ? 'synced' : 'unchanged',
            providerId,
            modelCount: replaceResult.modelCount,
        };
    }
}

export const providerMetadataOrchestrator = new ProviderMetadataOrchestrator();
