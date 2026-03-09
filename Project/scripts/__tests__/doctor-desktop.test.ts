import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { parseDesktopDoctorScope, resolveDesktopDoctorPaths } from '../doctor-desktop';

describe('doctor-desktop', () => {
    const previousUserDataPath = process.env['NEONCONDUCTOR_USER_DATA_PATH'];
    const previousRuntimeNamespace = process.env['NEONCONDUCTOR_RUNTIME_NAMESPACE'];
    const previousPersistenceChannel = process.env['NEONCONDUCTOR_PERSISTENCE_CHANNEL'];

    afterEach(() => {
        if (previousUserDataPath === undefined) {
            delete process.env['NEONCONDUCTOR_USER_DATA_PATH'];
        } else {
            process.env['NEONCONDUCTOR_USER_DATA_PATH'] = previousUserDataPath;
        }

        if (previousRuntimeNamespace === undefined) {
            delete process.env['NEONCONDUCTOR_RUNTIME_NAMESPACE'];
        } else {
            process.env['NEONCONDUCTOR_RUNTIME_NAMESPACE'] = previousRuntimeNamespace;
        }

        if (previousPersistenceChannel === undefined) {
            delete process.env['NEONCONDUCTOR_PERSISTENCE_CHANNEL'];
        } else {
            process.env['NEONCONDUCTOR_PERSISTENCE_CHANNEL'] = previousPersistenceChannel;
        }
    });

    it('defaults to packaged scope when no explicit scope is provided', () => {
        expect(parseDesktopDoctorScope([])).toBe('packaged');
    });

    it('resolves packaged storage under the selected packaged namespace', () => {
        const packagedUserDataPath = 'C:\\Users\\Neon\\AppData\\Roaming\\neon-conductor';
        process.env['NEONCONDUCTOR_USER_DATA_PATH'] = packagedUserDataPath;
        process.env['NEONCONDUCTOR_RUNTIME_NAMESPACE'] = 'beta';

        const desktopPaths = resolveDesktopDoctorPaths('packaged');

        expect(desktopPaths).toMatchObject({
            scope: 'packaged',
            userDataRoot: packagedUserDataPath,
            runtimeNamespace: 'beta',
            runtimeRoot: path.join(packagedUserDataPath, 'runtime', 'beta'),
            dbPath: path.join(packagedUserDataPath, 'runtime', 'beta', 'neonconductor.db'),
            logsRoot: path.join(packagedUserDataPath, 'logs'),
            isDevIsolatedStorage: false,
        });
    });

    it('resolves development storage under an isolated dev userData root', () => {
        const packagedUserDataPath = 'C:\\Users\\Neon\\AppData\\Roaming\\neon-conductor';
        process.env['NEONCONDUCTOR_USER_DATA_PATH'] = packagedUserDataPath;
        process.env['NEONCONDUCTOR_RUNTIME_NAMESPACE'] = 'alpha';

        const desktopPaths = resolveDesktopDoctorPaths('development');

        expect(desktopPaths).toMatchObject({
            scope: 'development',
            userDataRoot: `${packagedUserDataPath}-dev`,
            runtimeNamespace: 'development',
            runtimeRoot: path.join(`${packagedUserDataPath}-dev`, 'runtime', 'development'),
            dbPath: path.join(`${packagedUserDataPath}-dev`, 'runtime', 'development', 'neonconductor.db'),
            logsRoot: path.join(`${packagedUserDataPath}-dev`, 'logs'),
            isDevIsolatedStorage: true,
        });
    });
});
