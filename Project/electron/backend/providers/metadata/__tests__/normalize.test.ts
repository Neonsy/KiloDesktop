import { describe, expect, it } from 'vitest';

import { normalizeCatalogMetadata, toProviderCatalogUpsert } from '@/app/backend/providers/metadata/normalize';
import {
    applyProviderMetadataOverrideFromEntries,
    type ProviderMetadataOverrideEntry,
} from '@/app/backend/providers/metadata/overrides';
import type { NormalizedModelMetadata, ProviderCatalogModel } from '@/app/backend/providers/types';

function createCatalogModel(overrides?: Partial<ProviderCatalogModel>): ProviderCatalogModel {
    return {
        modelId: 'openai/gpt-5',
        label: 'GPT-5',
        isFree: false,
        capabilities: {
            supportsTools: true,
            supportsReasoning: true,
            supportsVision: false,
            supportsAudioInput: false,
            supportsAudioOutput: false,
            inputModalities: ['text'],
            outputModalities: ['text'],
        },
        pricing: {},
        raw: {},
        ...overrides,
    };
}

describe('provider metadata normalization', () => {
    it('keeps optional fields unknown when upstream metadata is thin', () => {
        const result = normalizeCatalogMetadata('openai', [createCatalogModel()]);
        expect(result.models).toHaveLength(1);
        const model = result.models[0];
        expect(model).toBeDefined();
        if (!model) {
            throw new Error('Expected normalized model.');
        }
        expect(model).toMatchObject({
            providerId: 'openai',
            modelId: 'openai/gpt-5',
            source: 'provider_api',
        });
        expect(model.contextLength).toBeUndefined();
        expect(model.inputPrice).toBeUndefined();
        expect(model.outputPrice).toBeUndefined();
        expect(model.maxOutputTokens).toBeUndefined();
    });

    it('derives safe metadata hints from pricing/raw payloads without overriding explicit values', () => {
        const result = normalizeCatalogMetadata('kilo', [
            createCatalogModel({
                modelId: 'kilo/auto',
                label: 'Kilo Auto',
                pricing: {
                    input: 0.000001,
                    output: 0.000003,
                    cache_read: 0.0000002,
                    cache_write: 0.0000005,
                },
                raw: {
                    latency_ms: 120,
                    tps: 35,
                    max_output_tokens: 8192,
                },
                contextLength: 200000,
            }),
        ]);

        expect(result.models).toHaveLength(1);
        const model = result.models[0];
        expect(model).toBeDefined();
        if (!model) {
            throw new Error('Expected normalized model.');
        }
        expect(model).toMatchObject({
            providerId: 'kilo',
            modelId: 'kilo/auto',
            contextLength: 200000,
            inputPrice: 0.000001,
            outputPrice: 0.000003,
            cacheReadPrice: 0.0000002,
            cacheWritePrice: 0.0000005,
            latency: 120,
            tps: 35,
            maxOutputTokens: 8192,
        });

        const upsert = toProviderCatalogUpsert(model);
        expect(upsert.contextLength).toBe(200000);
        expect(upsert.pricing?.['input']).toBe(0.000001);
        expect(upsert.pricing?.['output']).toBe(0.000003);
    });

    it('drops invalid metadata rows fail-closed', () => {
        const result = normalizeCatalogMetadata('openai', [
            createCatalogModel({
                pricing: {
                    input: -1,
                },
            }),
        ]);

        expect(result.models).toHaveLength(0);
        expect(result.droppedCount).toBe(1);
    });

    it('applies scoped overrides with higher precedence than provider values', () => {
        const model: NormalizedModelMetadata = {
            providerId: 'openai',
            modelId: 'openai/gpt-5',
            label: 'GPT-5',
            source: 'provider_api',
            updatedAt: '2026-03-05T00:00:00.000Z',
            inputPrice: 1,
        };
        const overrides: ProviderMetadataOverrideEntry[] = [
            {
                providerId: 'openai',
                modelId: 'openai/gpt-5',
                reason: 'known provider mismatch',
                updatedAt: '2026-03-01T00:00:00.000Z',
                patch: {
                    inputPrice: 0.5,
                },
            },
        ];

        const applied = applyProviderMetadataOverrideFromEntries(model, overrides);
        expect(applied.applied).toBe(true);
        expect(applied.model.inputPrice).toBe(0.5);
        expect(applied.model.source).toBe('override_registry');
        expect(applied.model.updatedAt).toBe('2026-03-01T00:00:00.000Z');
    });
});
