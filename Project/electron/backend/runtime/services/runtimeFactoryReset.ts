import { access, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { getDefaultProfileId, getPersistence, getPersistenceStoragePaths, reseedRuntimeData } from '@/app/backend/persistence/db';
import type {
    RuntimeFactoryResetCleanupCounts,
    RuntimeFactoryResetInput,
    RuntimeFactoryResetResult,
} from '@/app/backend/runtime/contracts';
import {
    errOp,
    okOp,
    toOperationalError,
    type OperationalResult,
} from '@/app/backend/runtime/services/common/operationalError';
import { planFullReset } from '@/app/backend/runtime/services/runtimeReset/full';
import { removeSecretsByReferences } from '@/app/backend/runtime/services/runtimeReset/secrets';
import { removeManagedGitWorktree } from '@/app/backend/runtime/services/worktree/git';
import { appLog, flushAppLogger } from '@/app/main/logging';

interface FactoryResetWorktreeTarget {
    workspaceRootPath: string | null;
    worktreePath: string;
}

export interface RuntimeFactoryResetService {
    reset(input: RuntimeFactoryResetInput): Promise<OperationalResult<RuntimeFactoryResetResult>>;
}

async function countRecursiveEntries(rootPath: string): Promise<number> {
    try {
        const dirents = await readdir(rootPath, { withFileTypes: true });
        let count = 0;

        for (const dirent of dirents) {
            const absolutePath = path.join(rootPath, dirent.name);
            count += 1;
            if (dirent.isDirectory()) {
                count += await countRecursiveEntries(absolutePath);
            }
        }

        return count;
    } catch (error) {
        if (isMissingPathError(error)) {
            return 0;
        }

        throw error;
    }
}

function isMissingPathError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'ENOENT'
    );
}

async function removeDirectoryTree(rootPath: string): Promise<number> {
    const entryCount = await countRecursiveEntries(rootPath);
    await rm(rootPath, { recursive: true, force: true });
    return entryCount;
}

async function collectManagedWorktreeTargets(): Promise<FactoryResetWorktreeTarget[]> {
    const { db } = getPersistence();
    const rows = await db
        .selectFrom('worktrees as worktree')
        .leftJoin('workspace_roots as workspaceRoot', (join) =>
            join
                .onRef('workspaceRoot.profile_id', '=', 'worktree.profile_id')
                .onRef('workspaceRoot.fingerprint', '=', 'worktree.workspace_fingerprint')
        )
        .select([
            'worktree.absolute_path as worktreePath',
            'workspaceRoot.absolute_path as workspaceRootPath',
        ])
        .execute();

    return rows.map((row) => ({
        worktreePath: row.worktreePath,
        workspaceRootPath: row.workspaceRootPath,
    }));
}

async function cleanupManagedWorktrees(rootPath: string): Promise<number> {
    const targets = await collectManagedWorktreeTargets();
    const entryCount = await countRecursiveEntries(rootPath);

    for (const target of targets) {
        try {
            await access(target.worktreePath);
        } catch (error) {
            if (isMissingPathError(error)) {
                continue;
            }

            throw error;
        }

        if (target.workspaceRootPath) {
            const removed = await removeManagedGitWorktree({
                workspaceRootPath: target.workspaceRootPath,
                worktreePath: target.worktreePath,
                removeFiles: true,
            });
            if (removed.isOk()) {
                continue;
            }
        }

        await rm(target.worktreePath, { recursive: true, force: true });
    }

    await rm(rootPath, { recursive: true, force: true });
    return entryCount;
}

class RuntimeFactoryResetServiceImpl implements RuntimeFactoryResetService {
    async reset(input: RuntimeFactoryResetInput): Promise<OperationalResult<RuntimeFactoryResetResult>> {
        const startedAt = Date.now();
        let logsRemoved = false;

        appLog.warn({
            tag: 'runtime.factory_reset',
            message: 'Factory reset requested.',
            confirm: input.confirm,
        });

        try {
            const { db } = getPersistence();
            const { globalAssetsRoot, logsRoot, managedWorktreesRoot } = getPersistenceStoragePaths();
            const plan = await planFullReset(db);

            const cleanupCounts: RuntimeFactoryResetCleanupCounts = {
                secretKeys: new Set(plan.secretKeyRefs).size,
                managedWorktreeEntries: await cleanupManagedWorktrees(managedWorktreesRoot),
                globalAssetEntries: await removeDirectoryTree(globalAssetsRoot),
                logEntries: 0,
            };

            await plan.apply(db);
            if (plan.reseedRuntimeData) {
                reseedRuntimeData();
            }
            await removeSecretsByReferences(plan.secretKeyRefs);

            await flushAppLogger();
            cleanupCounts.logEntries = await removeDirectoryTree(logsRoot);
            logsRemoved = true;

            return okOp({
                applied: true,
                counts: plan.counts,
                cleanupCounts,
                resetProfileId: getDefaultProfileId(),
            });
        } catch (error) {
            const operationalError = toOperationalError(error, 'request_failed', 'Factory reset failed.');
            if (!logsRemoved) {
                appLog.error({
                    tag: 'runtime.factory_reset',
                    message: 'Factory reset failed.',
                    durationMs: Date.now() - startedAt,
                    error: operationalError.message,
                    code: operationalError.code,
                });
            }

            return errOp(operationalError.code, operationalError.message, {
                ...(operationalError.details ? { details: operationalError.details } : {}),
                ...(operationalError.retryable !== undefined ? { retryable: operationalError.retryable } : {}),
            });
        }
    }
}

export const runtimeFactoryResetService: RuntimeFactoryResetService = new RuntimeFactoryResetServiceImpl();
