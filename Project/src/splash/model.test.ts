import { describe, expect, it } from 'vitest';

import { applySplashPhase, getSplashSubtitle, normalizeSplashPhase } from '@/web/splash/model';

describe('splash model', () => {
    it('normalizes unknown phases back to starting', () => {
        expect(normalizeSplashPhase(undefined)).toBe('starting');
        expect(normalizeSplashPhase('unexpected')).toBe('starting');
        expect(normalizeSplashPhase('delayed')).toBe('delayed');
    });

    it('applies the delayed phase subtitle without rebuilding the target', () => {
        const subtitleTarget = {
            textContent: 'Preparing the workspace and loading your agent shell.',
        };
        const target = {
            body: {
                dataset: {} as Record<string, string | undefined>,
            },
            getElementById: (id: string) => (id === 'splash-subtitle' ? subtitleTarget : null),
        };

        applySplashPhase(target, 'delayed');

        expect(target.body.dataset['phase']).toBe('delayed');
        expect(subtitleTarget.textContent).toBe(getSplashSubtitle('delayed'));
    });
});
