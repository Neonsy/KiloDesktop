export type SplashPhase = 'starting' | 'delayed';

export interface SplashPhaseDocumentTarget {
    body: {
        dataset: Record<string, string | undefined>;
    };
    getElementById(id: string): { textContent: string | null } | null;
}

export function normalizeSplashPhase(value: string | undefined): SplashPhase {
    return value === 'delayed' ? 'delayed' : 'starting';
}

export function getSplashSubtitle(phase: SplashPhase): string {
    return phase === 'delayed'
        ? 'Still starting. Preparing the workspace and runtime.'
        : 'Preparing the workspace and loading your agent shell.';
}

export function applySplashPhase(target: SplashPhaseDocumentTarget, phase: SplashPhase): void {
    target.body.dataset['phase'] = phase;

    const subtitleElement = target.getElementById('splash-subtitle');
    if (!subtitleElement) {
        return;
    }

    subtitleElement.textContent = getSplashSubtitle(phase);
}
