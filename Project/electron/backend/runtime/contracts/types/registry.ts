import type { EntityId } from '@/app/backend/runtime/contracts/ids';
import type { ProfileInput } from '@/app/backend/runtime/contracts/types/common';

export interface RegistryRefreshInput extends ProfileInput {
    workspaceFingerprint?: string;
    worktreeId?: EntityId<'wt'>;
}

export interface RegistryListResolvedInput extends ProfileInput {
    workspaceFingerprint?: string;
    worktreeId?: EntityId<'wt'>;
}

export interface RegistrySearchSkillsInput extends ProfileInput {
    query?: string;
    workspaceFingerprint?: string;
    worktreeId?: EntityId<'wt'>;
}
