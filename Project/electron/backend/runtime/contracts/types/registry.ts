import type { ProfileInput } from '@/app/backend/runtime/contracts/types/common';

export interface RegistryRefreshInput extends ProfileInput {
    workspaceFingerprint?: string;
}

export interface RegistryListResolvedInput extends ProfileInput {
    workspaceFingerprint?: string;
}

export interface RegistrySearchSkillsInput extends ProfileInput {
    query?: string;
    workspaceFingerprint?: string;
}
