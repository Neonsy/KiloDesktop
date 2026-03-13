import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProviderDefaultModelSection } from '@/web/components/settings/providerSettings/defaultModelSection';

describe('provider default model section', () => {
    it('shows capability-driven runtime notes without hiding the model entry', () => {
        const html = renderToStaticMarkup(
            createElement(ProviderDefaultModelSection, {
                selectedProviderId: 'openai',
                selectedModelId: 'openai/gpt-5-text',
                models: [
                    {
                        id: 'openai/gpt-5-text',
                        label: 'GPT-5 Text',
                        providerId: 'openai',
                        providerLabel: 'OpenAI',
                        supportsTools: false,
                        supportsVision: false,
                        supportsReasoning: true,
                        supportsPromptCache: false,
                        capabilityBadges: [],
                        compatibilityState: 'warning',
                        compatibilityReason: 'Connect OpenAI before using this model in runs.',
                    },
                ],
                catalogStateReason: null,
                isDefaultModel: true,
                isSavingDefault: false,
                isSyncingCatalog: false,
                onSelectModel: () => {},
                onSyncCatalog: () => {},
            })
        );

        expect(html).toContain('Connect OpenAI before using this model in runs.');
        expect(html).toContain('Runtime notes:');
        expect(html).toContain('Agent modes that require native tools will skip this model.');
    });

    it('shows explicit catalog failure state instead of implying an empty sync is healthy', () => {
        const html = renderToStaticMarkup(
            createElement(ProviderDefaultModelSection, {
                selectedProviderId: 'kilo',
                selectedModelId: '',
                models: [],
                catalogStateReason: 'catalog_sync_failed',
                catalogStateDetail: 'gateway returned no recognized provider family metadata',
                isDefaultModel: false,
                isSavingDefault: false,
                isSyncingCatalog: false,
                onSelectModel: () => {},
                onSyncCatalog: () => {},
            })
        );

        expect(html).toContain('Catalog sync failed: gateway returned no recognized provider family metadata');
        expect(html).not.toContain('Catalog synced (0 models).');
    });

    it('shows an explicit unusable-catalog state when sync returned zero usable models', () => {
        const html = renderToStaticMarkup(
            createElement(ProviderDefaultModelSection, {
                selectedProviderId: 'kilo',
                selectedModelId: '',
                models: [],
                catalogStateReason: 'catalog_empty_after_normalization',
                isDefaultModel: false,
                isSavingDefault: false,
                isSyncingCatalog: false,
                onSelectModel: () => {},
                onSyncCatalog: () => {},
            })
        );

        expect(html).toContain(
            'Catalog refreshed, but none of the returned Kilo models are currently usable in NeonConductor.'
        );
        expect(html).not.toContain('Catalog synced (0 models).');
    });
});
