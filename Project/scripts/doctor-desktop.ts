import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { scriptLog } from '@/scripts/logger';

interface PackageJsonSnapshot {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

function resolveUserDataRoot(): string {
    const explicitUserDataPath = process.env['NEONCONDUCTOR_USER_DATA_PATH']?.trim();
    if (explicitUserDataPath) {
        return explicitUserDataPath;
    }

    if (process.platform === 'win32') {
        return path.join(process.env['APPDATA'] ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'neon-conductor');
    }

    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'neon-conductor');
    }

    return path.join(process.env['XDG_CONFIG_HOME'] ?? path.join(os.homedir(), '.config'), 'neon-conductor');
}

function resolveDesktopPaths() {
    const userDataRoot = resolveUserDataRoot();
    const persistenceChannel = process.env['NEONCONDUCTOR_PERSISTENCE_CHANNEL']?.trim() || 'stable';
    const runtimeRoot = path.join(userDataRoot, 'runtime', persistenceChannel);

    return {
        userDataRoot,
        persistenceChannel,
        runtimeRoot,
        dbPath: path.join(runtimeRoot, 'neonconductor.db'),
        logsRoot: path.join(userDataRoot, 'logs'),
    };
}

function readPackageJson(): PackageJsonSnapshot {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJsonSnapshot;
}

function tableExists(database: DatabaseSync, tableName: string): boolean {
    const row = database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
        .get(tableName) as { name?: string } | undefined;

    return row?.name === tableName;
}

function countRows(database: DatabaseSync, tableName: string): number | null {
    if (!tableExists(database, tableName)) {
        return null;
    }

    const row = database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count?: number } | undefined;
    return row?.count ?? 0;
}

function main(): void {
    const packageJson = readPackageJson();
    const desktopPaths = resolveDesktopPaths();
    if (!existsSync(desktopPaths.dbPath)) {
        scriptLog.info({
            tag: 'doctor.desktop',
            message: 'Desktop runtime paths resolved; no database found yet.',
            nodeVersion: process.version,
            electronVersion: packageJson.devDependencies?.['electron'] ?? 'unknown',
            ...desktopPaths,
        });
        return;
    }

    const database = new DatabaseSync(desktopPaths.dbPath, {
        readOnly: true,
    });

    try {
        const providerSecretsCount = countRows(database, 'provider_secrets');

        scriptLog.info({
            tag: 'doctor.desktop',
            message: 'Desktop runtime doctor completed.',
            nodeVersion: process.version,
            electronVersion: packageJson.devDependencies?.['electron'] ?? 'unknown',
            ...desktopPaths,
            hasProviderSecretsTable: tableExists(database, 'provider_secrets'),
            providerSecretsCount,
        });
    } finally {
        database.close();
    }
}

main();
