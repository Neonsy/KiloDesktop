import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    exposeInMainWorldSpy,
    ipcOnSpy,
    ipcPhaseHandlerState,
} = vi.hoisted(() => ({
    exposeInMainWorldSpy: vi.fn(),
    ipcOnSpy: vi.fn(),
    ipcPhaseHandlerState: {
        handler: undefined as ((event: unknown, phase: unknown) => void) | undefined,
    },
}));

vi.mock('electron', () => ({
    contextBridge: {
        exposeInMainWorld: exposeInMainWorldSpy,
    },
    ipcRenderer: {
        on: (channel: string, handler: (event: unknown, phase: unknown) => void) => {
            ipcOnSpy(channel, handler);
            ipcPhaseHandlerState.handler = handler;
        },
    },
}));

describe('splash preload bridge', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        ipcPhaseHandlerState.handler = undefined;
    });

    it('exposes an onPhaseChange bridge that replays the latest splash phase', async () => {
        await import('@/app/main/preload/splash');

        expect(exposeInMainWorldSpy).toHaveBeenCalledTimes(1);
        const splashBridge = exposeInMainWorldSpy.mock.calls[0]?.[1] as {
            onPhaseChange: (listener: (phase: 'starting' | 'delayed') => void) => () => void;
        };

        const phaseListener = vi.fn();
        splashBridge.onPhaseChange(phaseListener);

        expect(phaseListener).toHaveBeenCalledWith('starting');

        ipcPhaseHandlerState.handler?.({}, 'delayed');

        expect(phaseListener).toHaveBeenLastCalledWith('delayed');
    });
});
