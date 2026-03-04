import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { permissionStore, toolStore } from '@/app/backend/persistence/stores';
import type { ToolRecord } from '@/app/backend/persistence/types';
import type { ToolInvokeInput } from '@/app/backend/runtime/contracts';
import { resolveEffectivePermissionPolicy } from '@/app/backend/runtime/services/permissions/policyResolver';
import { runtimeEventLogService } from '@/app/backend/runtime/services/runtimeEventLog';

interface ToolOutputEntry {
    path: string;
    kind: 'file' | 'directory';
}

type ToolExecutionResult =
    | {
          ok: true;
          toolId: string;
          output: Record<string, unknown>;
          at: string;
          policy: { effective: 'ask' | 'allow' | 'deny'; source: string };
      }
    | {
          ok: false;
          toolId: string;
          error: 'tool_not_found' | 'policy_denied' | 'permission_required' | 'invalid_args' | 'not_implemented' | 'execution_failed';
          message: string;
          args: Record<string, unknown>;
          at: string;
          policy?: { effective: 'ask' | 'allow' | 'deny'; source: string };
          requestId?: string;
      };

function readStringArg(args: Record<string, unknown>, key: string): string | undefined {
    const value = args[key];
    if (value === undefined) {
        return undefined;
    }
    return typeof value === 'string' ? value.trim() : undefined;
}

function readBooleanArg(args: Record<string, unknown>, key: string, fallback: boolean): boolean {
    const value = args[key];
    return typeof value === 'boolean' ? value : fallback;
}

function readNumberArg(args: Record<string, unknown>, key: string, fallback: number): number {
    const value = args[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    return fallback;
}

function normalizeToolPath(targetPath: string | undefined): string {
    if (!targetPath || targetPath.length === 0) {
        return process.cwd();
    }

    if (path.isAbsolute(targetPath)) {
        return path.normalize(targetPath);
    }

    return path.resolve(process.cwd(), targetPath);
}

async function listFilesTool(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const rootPath = normalizeToolPath(readStringArg(args, 'path'));
    const includeHidden = readBooleanArg(args, 'includeHidden', false);
    const recursive = readBooleanArg(args, 'recursive', false);
    const maxEntries = Math.max(1, Math.floor(readNumberArg(args, 'maxEntries', 200)));
    const entries: ToolOutputEntry[] = [];
    const queue = [rootPath];

    while (queue.length > 0 && entries.length < maxEntries) {
        const current = queue.shift();
        if (!current) {
            continue;
        }

        const dirents = await readdir(current, { withFileTypes: true });
        for (const dirent of dirents) {
            if (!includeHidden && dirent.name.startsWith('.')) {
                continue;
            }

            const itemPath = path.join(current, dirent.name);
            if (dirent.isDirectory()) {
                entries.push({ path: itemPath, kind: 'directory' });
                if (recursive) {
                    queue.push(itemPath);
                }
            } else if (dirent.isFile()) {
                entries.push({ path: itemPath, kind: 'file' });
            }

            if (entries.length >= maxEntries) {
                break;
            }
        }
    }

    return {
        rootPath,
        entries,
        truncated: queue.length > 0 || entries.length >= maxEntries,
        count: entries.length,
    };
}

async function readFileTool(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const fileArg = readStringArg(args, 'path');
    if (!fileArg) {
        throw new Error('Missing "path" argument.');
    }

    const maxBytes = Math.max(1, Math.floor(readNumberArg(args, 'maxBytes', 200_000)));
    const targetPath = normalizeToolPath(fileArg);
    const buffer = await readFile(targetPath);
    const truncated = buffer.byteLength > maxBytes;
    const content = buffer.subarray(0, maxBytes).toString('utf8');

    return {
        path: targetPath,
        content,
        byteLength: buffer.byteLength,
        truncated,
    };
}

async function executeTool(tool: ToolRecord, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (tool.id === 'list_files') {
        return listFilesTool(args);
    }

    if (tool.id === 'read_file') {
        return readFileTool(args);
    }

    if (tool.id === 'run_command') {
        throw new Error('Tool "run_command" is not implemented yet.');
    }

    throw new Error(`Tool "${tool.id}" is not implemented.`);
}

export class ToolExecutionService {
    async invoke(input: ToolInvokeInput): Promise<ToolExecutionResult> {
        const at = new Date().toISOString();
        const args = input.args ?? {};
        const tools = await toolStore.list();
        const tool = tools.find((candidate) => candidate.id === input.toolId);

        if (!tool) {
            return {
                ok: false,
                toolId: input.toolId,
                error: 'tool_not_found',
                message: `Tool "${input.toolId}" was not found.`,
                args,
                at,
            };
        }

        const resource = `tool:${tool.id}`;
        const resolvedPolicy = await resolveEffectivePermissionPolicy({
            profileId: input.profileId,
            resource,
            topLevelTab: input.topLevelTab,
            modeKey: input.modeKey,
            toolDefaultPolicy: tool.permissionPolicy,
            ...(input.workspaceFingerprint ? { workspaceFingerprint: input.workspaceFingerprint } : {}),
        });

        if (resolvedPolicy.policy === 'deny') {
            await runtimeEventLogService.append({
                entityType: 'tool',
                entityId: tool.id,
                eventType: 'tool.invocation.blocked',
                payload: {
                    profileId: input.profileId,
                    toolId: tool.id,
                    resource,
                    policy: resolvedPolicy.policy,
                    source: resolvedPolicy.source,
                    reason: 'policy_denied',
                },
            });

            return {
                ok: false,
                toolId: tool.id,
                error: 'policy_denied',
                message: `Tool "${tool.id}" is denied by current policy (${resolvedPolicy.source}).`,
                args,
                at,
                policy: {
                    effective: resolvedPolicy.policy,
                    source: resolvedPolicy.source,
                },
            };
        }

        if (resolvedPolicy.policy === 'ask') {
            const request = await permissionStore.create({
                policy: 'ask',
                resource,
                rationale: `Tool invocation requires confirmation (${tool.id}).`,
            });

            await runtimeEventLogService.append({
                entityType: 'permission',
                entityId: request.id,
                eventType: 'permission.requested',
                payload: {
                    request,
                    source: 'tool.invoke',
                    toolId: tool.id,
                },
            });

            await runtimeEventLogService.append({
                entityType: 'tool',
                entityId: tool.id,
                eventType: 'tool.invocation.blocked',
                payload: {
                    profileId: input.profileId,
                    toolId: tool.id,
                    resource,
                    policy: resolvedPolicy.policy,
                    source: resolvedPolicy.source,
                    reason: 'permission_required',
                    requestId: request.id,
                },
            });

            return {
                ok: false,
                toolId: tool.id,
                error: 'permission_required',
                message: `Tool "${tool.id}" requires permission approval.`,
                args,
                at,
                requestId: request.id,
                policy: {
                    effective: resolvedPolicy.policy,
                    source: resolvedPolicy.source,
                },
            };
        }

        try {
            const output = await executeTool(tool, args);
            await runtimeEventLogService.append({
                entityType: 'tool',
                entityId: tool.id,
                eventType: 'tool.invocation.completed',
                payload: {
                    profileId: input.profileId,
                    toolId: tool.id,
                    resource,
                    policy: resolvedPolicy.policy,
                    source: resolvedPolicy.source,
                },
            });

            return {
                ok: true,
                toolId: tool.id,
                output,
                at,
                policy: {
                    effective: resolvedPolicy.policy,
                    source: resolvedPolicy.source,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const code = message.includes('not implemented') ? 'not_implemented' : 'execution_failed';

            await runtimeEventLogService.append({
                entityType: 'tool',
                entityId: tool.id,
                eventType: 'tool.invocation.failed',
                payload: {
                    profileId: input.profileId,
                    toolId: tool.id,
                    resource,
                    policy: resolvedPolicy.policy,
                    source: resolvedPolicy.source,
                    error: message,
                },
            });

            return {
                ok: false,
                toolId: tool.id,
                error: code,
                message,
                args,
                at,
                policy: {
                    effective: resolvedPolicy.policy,
                    source: resolvedPolicy.source,
                },
            };
        }
    }
}

export const toolExecutionService = new ToolExecutionService();
