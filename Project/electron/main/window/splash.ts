import { BrowserWindow } from 'electron';
import path from 'node:path';

import { resolveRuntimeAssetPath } from '@/app/main/runtime/assets';
import { resolveSplashWindowPreloadPath } from '@/app/main/window/preloadPaths';
import { SPLASH_PHASE_CHANNEL, type SplashPhase } from '@/app/shared/splashContract';

const splashWindowPhaseById = new Map<number, SplashPhase>();

export interface SplashWindowOptions {
    appPath: string;
    devServerUrl?: string;
    isPackaged: boolean;
    mainDirname: string;
    resourcesPath?: string;
}

export function resolveSplashAssetPath(input: {
    appPath: string;
    isPackaged: boolean;
    resourcesPath?: string;
}): string {
    return resolveRuntimeAssetPath({
        isPackaged: input.isPackaged,
        appPath: input.appPath,
        relativePath: input.isPackaged ? 'assets/appicon.png' : 'src/assets/appicon.png',
        ...(input.resourcesPath ? { resourcesPath: input.resourcesPath } : {}),
    });
}

export function resolveSplashPageLocation(
    options: SplashWindowOptions
): { kind: 'url'; value: string } | { kind: 'file'; value: string } {
    if (!options.isPackaged && options.devServerUrl) {
        return {
            kind: 'url',
            value: new URL('splash.html', ensureTrailingSlash(options.devServerUrl)).toString(),
        };
    }

    return {
        kind: 'file',
        value: path.join(options.mainDirname, '../dist/splash.html'),
    };
}

function ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
}

function sendSplashPhase(window: BrowserWindow, phase: SplashPhase): void {
    if (window.isDestroyed()) {
        return;
    }

    splashWindowPhaseById.set(window.id, phase);
    window.webContents.send(SPLASH_PHASE_CHANNEL, phase);
}

export function updateSplashWindowPhase(
    splashWindow: BrowserWindow,
    _options: SplashWindowOptions,
    phase: SplashPhase
): Promise<void> {
    sendSplashPhase(splashWindow, phase);
    return Promise.resolve();
}

export function createSplashWindow(options: SplashWindowOptions): BrowserWindow {
    const assetPath = resolveSplashAssetPath({
        appPath: options.appPath,
        isPackaged: options.isPackaged,
        ...(options.resourcesPath ? { resourcesPath: options.resourcesPath } : {}),
    });

    const splashWindow = new BrowserWindow({
        width: 400,
        height: 480,
        minWidth: 400,
        minHeight: 480,
        maxWidth: 400,
        maxHeight: 480,
        show: false,
        frame: false,
        resizable: false,
        movable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        center: true,
        backgroundColor: '#090b12',
        icon: assetPath,
        webPreferences: {
            preload: resolveSplashWindowPreloadPath(options.mainDirname),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            devTools: false,
        },
    });

    splashWindowPhaseById.set(splashWindow.id, 'starting');
    splashWindow.once('ready-to-show', () => {
        splashWindow.show();
    });
    splashWindow.once('closed', () => {
        splashWindowPhaseById.delete(splashWindow.id);
    });
    splashWindow.webContents.on('did-finish-load', () => {
        const currentPhase = splashWindowPhaseById.get(splashWindow.id) ?? 'starting';
        sendSplashPhase(splashWindow, currentPhase);
    });
    splashWindow.removeMenu();

    const splashPageLocation = resolveSplashPageLocation(options);
    if (splashPageLocation.kind === 'url') {
        void splashWindow.loadURL(splashPageLocation.value);
    } else {
        void splashWindow.loadFile(splashPageLocation.value);
    }

    return splashWindow;
}
