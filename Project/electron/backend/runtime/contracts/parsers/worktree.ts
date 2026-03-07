import { executionEnvironmentModes } from '@/app/backend/runtime/contracts/enums';
import {
    createParser,
    readEntityId,
    readEnumValue,
    readObject,
    readOptionalBoolean,
    readOptionalString,
    readProfileId,
    readString,
} from '@/app/backend/runtime/contracts/parsers/helpers';
import type {
    WorktreeByIdInput,
    WorktreeConfigureThreadInput,
    WorktreeCreateInput,
    WorktreeListInput,
    WorktreeRemoveInput,
} from '@/app/backend/runtime/contracts/types';

export function parseWorktreeListInput(input: unknown): WorktreeListInput {
    const source = readObject(input, 'input');
    const workspaceFingerprint = readOptionalString(source.workspaceFingerprint, 'workspaceFingerprint');

    return {
        profileId: readProfileId(source),
        ...(workspaceFingerprint ? { workspaceFingerprint } : {}),
    };
}

export function parseWorktreeCreateInput(input: unknown): WorktreeCreateInput {
    const source = readObject(input, 'input');
    const baseBranch = readOptionalString(source.baseBranch, 'baseBranch');
    const label = readOptionalString(source.label, 'label');

    return {
        profileId: readProfileId(source),
        workspaceFingerprint: readString(source.workspaceFingerprint, 'workspaceFingerprint'),
        branch: readString(source.branch, 'branch'),
        ...(baseBranch ? { baseBranch } : {}),
        ...(label ? { label } : {}),
    };
}

export function parseWorktreeByIdInput(input: unknown): WorktreeByIdInput {
    const source = readObject(input, 'input');
    return {
        profileId: readProfileId(source),
        worktreeId: readEntityId(source.worktreeId, 'worktreeId', 'wt'),
    };
}

export function parseWorktreeRemoveInput(input: unknown): WorktreeRemoveInput {
    const source = readObject(input, 'input');
    const removeFiles = readOptionalBoolean(source.removeFiles, 'removeFiles');

    return {
        profileId: readProfileId(source),
        worktreeId: readEntityId(source.worktreeId, 'worktreeId', 'wt'),
        ...(removeFiles !== undefined ? { removeFiles } : {}),
    };
}

export function parseWorktreeConfigureThreadInput(input: unknown): WorktreeConfigureThreadInput {
    const source = readObject(input, 'input');
    const mode = readEnumValue(source.mode, 'mode', executionEnvironmentModes);
    const executionBranch = readOptionalString(source.executionBranch, 'executionBranch');
    const baseBranch = readOptionalString(source.baseBranch, 'baseBranch');
    const worktreeId =
        source.worktreeId !== undefined ? readEntityId(source.worktreeId, 'worktreeId', 'wt') : undefined;

    if (mode === 'worktree' && !worktreeId) {
        throw new Error('Invalid "worktreeId": required when mode is "worktree".');
    }
    if (mode !== 'worktree' && worktreeId) {
        throw new Error('Invalid "worktreeId": allowed only when mode is "worktree".');
    }

    return {
        profileId: readProfileId(source),
        threadId: readEntityId(source.threadId, 'threadId', 'thr'),
        mode,
        ...(executionBranch ? { executionBranch } : {}),
        ...(baseBranch ? { baseBranch } : {}),
        ...(worktreeId ? { worktreeId } : {}),
    };
}

export const worktreeListInputSchema = createParser(parseWorktreeListInput);
export const worktreeCreateInputSchema = createParser(parseWorktreeCreateInput);
export const worktreeByIdInputSchema = createParser(parseWorktreeByIdInput);
export const worktreeRemoveInputSchema = createParser(parseWorktreeRemoveInput);
export const worktreeConfigureThreadInputSchema = createParser(parseWorktreeConfigureThreadInput);
