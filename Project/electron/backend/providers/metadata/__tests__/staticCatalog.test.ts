import { describe, expect, it } from 'vitest';

import { listStaticModelDefinitions } from '@/app/backend/providers/metadata/staticCatalog/registry';

describe('static model catalog', () => {
    it('ships context lengths for every static provider model', () => {
        const definitions = [
            ...listStaticModelDefinitions('openai', 'default'),
            ...listStaticModelDefinitions('zai', 'coding_international'),
            ...listStaticModelDefinitions('zai', 'general_international'),
            ...listStaticModelDefinitions('moonshot', 'standard_api'),
            ...listStaticModelDefinitions('moonshot', 'coding_plan'),
        ];

        expect(definitions.length).toBeGreaterThan(0);
        for (const definition of definitions) {
            expect(definition.contextLength).toBeDefined();
            expect(definition.contextLength).toBeGreaterThan(0);
            expect(definition.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(definition.sourceNote.length).toBeGreaterThan(0);
        }
    });

    it('ships explicit max output tokens for current openai and zai models', () => {
        const definitions = [
            ...listStaticModelDefinitions('openai', 'default'),
            ...listStaticModelDefinitions('zai', 'coding_international'),
        ];

        for (const definition of definitions) {
            expect(definition.maxOutputTokens).toBeDefined();
            expect(definition.maxOutputTokens).toBeGreaterThan(0);
        }
    });

    it('exposes the curated chat-capable non-kilo model sets by endpoint profile', () => {
        expect(listStaticModelDefinitions('openai', 'default').map((definition) => definition.modelId)).toEqual([
            'openai/gpt-5-codex',
            'openai/codex-mini',
            'openai/gpt-5',
            'openai/gpt-5-mini',
            'openai/gpt-5-nano',
        ]);
        expect(
            listStaticModelDefinitions('zai', 'coding_international').map((definition) => definition.modelId)
        ).toEqual([
            'zai/glm-4.5',
            'zai/glm-4.5-air',
            'zai/glm-4.5-flash',
            'zai/glm-4.5v',
            'zai/glm-4.6',
        ]);
        expect(
            listStaticModelDefinitions('zai', 'general_international').map((definition) => definition.modelId)
        ).toEqual([
            'zai/glm-4.5',
            'zai/glm-4.5-air',
            'zai/glm-4.5-flash',
            'zai/glm-4.5v',
            'zai/glm-4.6',
        ]);
        expect(
            listStaticModelDefinitions('moonshot', 'coding_plan').map((definition) => definition.modelId)
        ).toEqual([
            'moonshot/kimi-for-coding',
            'moonshot/kimi-k2',
            'moonshot/kimi-k2-thinking',
            'moonshot/kimi-k2-thinking-turbo',
            'moonshot/kimi-latest',
        ]);
        expect(
            listStaticModelDefinitions('moonshot', 'standard_api').map((definition) => definition.modelId)
        ).toEqual([
            'moonshot/kimi-k2-thinking',
            'moonshot/kimi-k2',
            'moonshot/kimi-k2-thinking-turbo',
            'moonshot/kimi-latest',
        ]);
    });

    it('marks vision-capable static models with image input modalities', () => {
        const openAiVisionModels = listStaticModelDefinitions('openai', 'default');
        expect(openAiVisionModels.every((definition) => definition.supportsVision === true)).toBe(true);
        expect(openAiVisionModels.every((definition) => definition.inputModalities?.includes('image'))).toBe(true);

        const zaiVisionModels = listStaticModelDefinitions('zai', 'coding_international').filter(
            (definition) => definition.supportsVision
        );
        expect(zaiVisionModels.map((definition) => definition.modelId)).toEqual(['zai/glm-4.5v', 'zai/glm-4.6']);
        expect(zaiVisionModels.every((definition) => definition.inputModalities?.includes('image'))).toBe(true);
    });
});
