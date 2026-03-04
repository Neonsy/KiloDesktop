import { permissionPolicyOverrideStore } from '@/app/backend/persistence/stores';
import type { PermissionPolicy, TopLevelTab } from '@/app/backend/runtime/contracts';

export interface ResolvedPermissionPolicy {
    policy: PermissionPolicy;
    source: 'mode' | 'workspace_override' | 'profile_override' | 'tool_default';
}

function extractToolIdFromResource(resource: string): string | null {
    if (!resource.startsWith('tool:')) {
        return null;
    }

    const toolId = resource.slice('tool:'.length).trim();
    return toolId.length > 0 ? toolId : null;
}

function isMutatingTool(toolId: string): boolean {
    return toolId === 'run_command';
}

function resolveModePolicy(topLevelTab: TopLevelTab, modeKey: string, resource: string): PermissionPolicy | null {
    const toolId = extractToolIdFromResource(resource);
    if (!toolId) {
        return null;
    }

    if (modeKey === 'plan') {
        return 'deny';
    }

    if (topLevelTab === 'agent' && modeKey === 'ask') {
        return isMutatingTool(toolId) ? 'deny' : 'allow';
    }

    return null;
}

export async function resolveEffectivePermissionPolicy(input: {
    profileId: string;
    resource: string;
    topLevelTab: TopLevelTab;
    modeKey: string;
    workspaceFingerprint?: string;
    toolDefaultPolicy: PermissionPolicy;
}): Promise<ResolvedPermissionPolicy> {
    const modePolicy = resolveModePolicy(input.topLevelTab, input.modeKey, input.resource);
    if (modePolicy) {
        return {
            policy: modePolicy,
            source: 'mode',
        };
    }

    if (input.workspaceFingerprint) {
        const scopeKey = permissionPolicyOverrideStore.toWorkspaceScopeKey(input.workspaceFingerprint);
        const workspaceOverride = await permissionPolicyOverrideStore.get(input.profileId, scopeKey, input.resource);
        if (workspaceOverride) {
            return {
                policy: workspaceOverride.policy,
                source: 'workspace_override',
            };
        }
    }

    const profileOverride = await permissionPolicyOverrideStore.get(
        input.profileId,
        permissionPolicyOverrideStore.toProfileScopeKey(),
        input.resource
    );
    if (profileOverride) {
        return {
            policy: profileOverride.policy,
            source: 'profile_override',
        };
    }

    return {
        policy: input.toolDefaultPolicy,
        source: 'tool_default',
    };
}
