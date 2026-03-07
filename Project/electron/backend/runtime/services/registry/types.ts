import type { ModeDefinitionRecord, RulesetDefinitionRecord, SkillfileDefinitionRecord } from '@/app/backend/persistence/types';

export interface RegistryPaths {
    globalAssetsRoot: string;
    workspaceAssetsRoot?: string;
}

export interface RegistryResolvedView {
    modes: ModeDefinitionRecord[];
    rulesets: RulesetDefinitionRecord[];
    skillfiles: SkillfileDefinitionRecord[];
}

export interface RegistryDiscoveredView {
    global: RegistryResolvedView;
    workspace?: RegistryResolvedView;
}

export interface RegistryListResolvedResult {
    paths: RegistryPaths;
    discovered: RegistryDiscoveredView;
    resolved: RegistryResolvedView;
}

export interface RegistryRefreshResult {
    paths: RegistryPaths;
    refreshed: {
        global: {
            modes: number;
            rulesets: number;
            skillfiles: number;
        };
        workspace?: {
            modes: number;
            rulesets: number;
            skillfiles: number;
        };
    };
}
