import {
    createParser,
    readObject,
    readOptionalString,
    readProfileId,
} from '@/app/backend/runtime/contracts/parsers/helpers';
import type {
    RegistryListResolvedInput,
    RegistryRefreshInput,
    RegistrySearchSkillsInput,
} from '@/app/backend/runtime/contracts/types';

export function parseRegistryRefreshInput(input: unknown): RegistryRefreshInput {
    const source = readObject(input, 'input');
    const workspaceFingerprint = readOptionalString(source.workspaceFingerprint, 'workspaceFingerprint');

    return {
        profileId: readProfileId(source),
        ...(workspaceFingerprint ? { workspaceFingerprint } : {}),
    };
}

export function parseRegistryListResolvedInput(input: unknown): RegistryListResolvedInput {
    return parseRegistryRefreshInput(input);
}

export function parseRegistrySearchSkillsInput(input: unknown): RegistrySearchSkillsInput {
    const source = readObject(input, 'input');
    const workspaceFingerprint = readOptionalString(source.workspaceFingerprint, 'workspaceFingerprint');
    const query = readOptionalString(source.query, 'query');

    return {
        profileId: readProfileId(source),
        ...(query ? { query } : {}),
        ...(workspaceFingerprint ? { workspaceFingerprint } : {}),
    };
}

export const registryRefreshInputSchema = createParser(parseRegistryRefreshInput);
export const registryListResolvedInputSchema = createParser(parseRegistryListResolvedInput);
export const registrySearchSkillsInputSchema = createParser(parseRegistrySearchSkillsInput);
