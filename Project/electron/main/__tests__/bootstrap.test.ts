import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    appOnSpy,
    appQuitSpy,
    appExitSpy,
    setApplicationMenuSpy,
    initializePersistenceSpy,
    closePersistenceSpy,
    initializeSecretStoreSpy,
    getSecretStoreInfoSpy,
    registerWindowStateBridgeSpy,
    handleStartupFailureSpy,
    initAppLoggerSpy,
    flushAppLoggerSpy,
    appLogInfoSpy,
    attachCspHeadersSpy,
    createMainWindowSpy,
    createIPCHandlerInputSpy,
    attachWindowSpy,
} = vi.hoisted(() => ({
    appOnSpy: vi.fn(),
    appQuitSpy: vi.fn(),
    appExitSpy: vi.fn(),
    setApplicationMenuSpy: vi.fn(),
    initializePersistenceSpy: vi.fn(),
    closePersistenceSpy: vi.fn(),
    initializeSecretStoreSpy: vi.fn(),
    getSecretStoreInfoSpy: vi.fn(() => ({
        backend: 'database',
        available: true,
    })),
    registerWindowStateBridgeSpy: vi.fn(),
    handleStartupFailureSpy: vi.fn(),
    initAppLoggerSpy: vi.fn(),
    flushAppLoggerSpy: vi.fn(() => Promise.resolve()),
    appLogInfoSpy: vi.fn(),
    attachCspHeadersSpy: vi.fn(),
    createMainWindowSpy: vi.fn(() => ({ id: 'window-main' })),
    createIPCHandlerInputSpy: vi.fn((input: unknown) => input),
    attachWindowSpy: vi.fn(),
}));

const appEventHandlers = new Map<string, Array<(...arguments_: unknown[]) => unknown>>();

vi.mock('electron', () => ({
    app: {
        whenReady: () => Promise.resolve(),
        getVersion: () => '0.0.1',
        getPath: (pathName: string) =>
            pathName === 'userData' ? 'C:\\Users\\Neon\\AppData\\Roaming\\neon-conductor' : 'unknown',
        on: (eventName: string, handler: (...arguments_: unknown[]) => unknown) => {
            const handlers = appEventHandlers.get(eventName) ?? [];
            handlers.push(handler);
            appEventHandlers.set(eventName, handlers);
            appOnSpy(eventName, handler);
            return undefined;
        },
        quit: appQuitSpy,
        exit: appExitSpy,
    },
    BrowserWindow: {
        getAllWindows: () => [],
    },
    Menu: {
        setApplicationMenu: setApplicationMenuSpy,
    },
}));

vi.mock('electron-trpc-experimental/main', () => ({
    createIPCHandler: (input: unknown) => {
        const ipcHandler = {
            attachWindow: attachWindowSpy,
        };
        createIPCHandlerInputSpy(input);
        return ipcHandler;
    },
}));

vi.mock('@/app/backend/persistence/db', () => ({
    initializePersistence: initializePersistenceSpy,
    closePersistence: closePersistenceSpy,
}));

vi.mock('@/app/backend/secrets/store', () => ({
    initializeSecretStore: initializeSecretStoreSpy,
    getSecretStoreInfo: getSecretStoreInfoSpy,
}));

vi.mock('@/app/backend/trpc/routers/system/windowControls', () => ({
    registerWindowStateBridge: registerWindowStateBridgeSpy,
}));

vi.mock('@/app/main/bootstrap/startupFailure', () => ({
    handleStartupFailure: handleStartupFailureSpy,
}));

vi.mock('@/app/main/logging', () => ({
    initAppLogger: initAppLoggerSpy,
    flushAppLogger: flushAppLoggerSpy,
    appLog: {
        info: appLogInfoSpy,
    },
}));

vi.mock('@/app/main/runtime/env', () => ({
    isDev: true,
    devServerUrl: 'http://localhost:5173',
    getMainDirname: () => 'M:\\Neonsy\\Projects\\NeonConductor\\Project\\electron\\main',
}));

vi.mock('@/app/main/security/cspHeaders', () => ({
    attachCspHeaders: attachCspHeadersSpy,
}));

vi.mock('@/app/main/window/factory', () => ({
    createMainWindow: createMainWindowSpy,
}));

describe('bootstrapMainProcess', () => {
    beforeEach(() => {
        appEventHandlers.clear();
        vi.clearAllMocks();
        getSecretStoreInfoSpy.mockReturnValue({
            backend: 'database',
            available: true,
        });
    });

    it('boots persistence, secrets, IPC, and window wiring through the Electron main path', async () => {
        const { bootstrapMainProcess } = await import('@/app/main/bootstrap');

        const createContext = vi.fn(() => Promise.resolve({} as never));
        const initAutoUpdater = vi.fn();
        const appRouter = {} as never;

        bootstrapMainProcess(
            {
                createContext,
                appRouter,
                initAutoUpdater,
                resolvePersistenceChannel: () => 'stable',
            },
            'file:///M:/Neonsy/Projects/NeonConductor/Project/electron/main/index.ts'
        );

        await Promise.resolve();
        await Promise.resolve();

        const expectedDbPath = path.join(
            'C:\\Users\\Neon\\AppData\\Roaming\\neon-conductor',
            'runtime',
            'stable',
            'neonconductor.db'
        );

        expect(initializePersistenceSpy).toHaveBeenCalledWith({
            dbPath: expectedDbPath,
        });
        expect(initializeSecretStoreSpy).toHaveBeenCalled();
        expect(attachCspHeadersSpy).toHaveBeenCalled();
        expect(createMainWindowSpy).toHaveBeenCalled();
        expect(registerWindowStateBridgeSpy).toHaveBeenCalledWith({ id: 'window-main' });
        expect(createIPCHandlerInputSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                router: appRouter,
                createContext,
                windows: [{ id: 'window-main' }],
            })
        );
        expect(initAutoUpdater).toHaveBeenCalled();

        const browserWindowCreatedHandlers = appEventHandlers.get('browser-window-created') ?? [];
        expect(browserWindowCreatedHandlers).toHaveLength(1);
        browserWindowCreatedHandlers[0]?.({}, { id: 'window-secondary' });
        expect(attachWindowSpy).toHaveBeenCalledWith({ id: 'window-secondary' });
        expect(registerWindowStateBridgeSpy).toHaveBeenCalledWith({ id: 'window-secondary' });

        const beforeQuitHandlers = appEventHandlers.get('before-quit') ?? [];
        expect(beforeQuitHandlers).toHaveLength(1);
        beforeQuitHandlers[0]?.();
        expect(closePersistenceSpy).toHaveBeenCalled();
        expect(flushAppLoggerSpy).toHaveBeenCalled();
        expect(handleStartupFailureSpy).not.toHaveBeenCalled();
    });
});
