import mascotUrl from '@/web/assets/appicon.png';
import { applySplashPhase, normalizeSplashPhase } from '@/web/splash/model';

import './styles.css';

function initializeSplash(): void {
    const mascotImage = document.querySelector<HTMLImageElement>('[data-splash-mascot]');
    if (mascotImage) {
        mascotImage.src = mascotUrl;
    }

    applySplashPhase(document, normalizeSplashPhase(document.body.dataset['phase']));

    const removePhaseListener = window.neonSplash?.onPhaseChange((phase: 'starting' | 'delayed') => {
        applySplashPhase(document, phase);
    });

    window.addEventListener(
        'beforeunload',
        () => {
            removePhaseListener?.();
        },
        { once: true }
    );
}

initializeSplash();
