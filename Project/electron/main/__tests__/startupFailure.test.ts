import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveStartupFailureDialog } from '@/app/main/bootstrap/startupFailure';

describe('startup failure diagnostics', () => {
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

    it('falls back to a generic startup message for other failures', () => {
        const dialog = resolveStartupFailureDialog(new Error('Generic startup failure'));

        expect(dialog.title).toBe('NeonConductor Failed To Start');
        expect(dialog.message).toContain('Generic startup failure');
    });

    it('reports the isolated development database and logs paths when available', () => {
        const userDataPath = 'C:\\Users\\Neon\\AppData\\Roaming\\neon-conductor-dev';
        process.env['NEONCONDUCTOR_USER_DATA_PATH'] = userDataPath;
        process.env['NEONCONDUCTOR_RUNTIME_NAMESPACE'] = 'development';
        delete process.env['NEONCONDUCTOR_PERSISTENCE_CHANNEL'];

        const dialog = resolveStartupFailureDialog(new Error('Database busy'));

        expect(dialog.message).toContain(path.join(userDataPath, 'runtime', 'development', 'neonconductor.db'));
        expect(dialog.message).toContain(path.join(userDataPath, 'logs'));
    });
});
