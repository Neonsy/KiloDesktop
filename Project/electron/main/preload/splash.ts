import { contextBridge, ipcRenderer } from 'electron';

import { isSplashPhase, SPLASH_PHASE_CHANNEL, type SplashPhase } from '@/app/shared/splashContract';

type SplashPhaseListener = (phase: SplashPhase) => void;

const splashPhaseListeners = new Set<SplashPhaseListener>();
let currentSplashPhase: SplashPhase = 'starting';

ipcRenderer.on(SPLASH_PHASE_CHANNEL, (_event, nextPhase: unknown) => {
    if (!isSplashPhase(nextPhase)) {
        return;
    }

    currentSplashPhase = nextPhase;

    for (const listener of splashPhaseListeners) {
        listener(currentSplashPhase);
    }
});

contextBridge.exposeInMainWorld('neonSplash', {
    onPhaseChange(listener: SplashPhaseListener): () => void {
        splashPhaseListeners.add(listener);
        listener(currentSplashPhase);

        return () => {
            splashPhaseListeners.delete(listener);
        };
    },
});
