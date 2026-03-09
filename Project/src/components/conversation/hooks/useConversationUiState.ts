import { useEffect, useState } from 'react';

import type { Dispatch, SetStateAction } from 'react';

type ScopeFilter = 'all' | 'workspace' | 'detached';
type ThreadSort = 'latest' | 'alphabetical';
type ThreadGroupView = 'workspace' | 'branch';

interface StoredConversationUiState {
    scopeFilter?: ScopeFilter;
    workspaceFilter?: string;
    sort?: ThreadSort;
    showAllModes?: boolean;
    groupView?: ThreadGroupView;
    selectedThreadId?: string;
    selectedSessionId?: string;
    selectedRunId?: string;
    selectedTagIds?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseScopeFilter(value: unknown): ScopeFilter | undefined {
    return value === 'all' || value === 'workspace' || value === 'detached' ? value : undefined;
}

function parseThreadSort(value: unknown): ThreadSort | undefined {
    return value === 'latest' || value === 'alphabetical' ? value : undefined;
}

function parseThreadGroupView(value: unknown): ThreadGroupView | undefined {
    return value === 'workspace' || value === 'branch' ? value : undefined;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function parseOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function parseOptionalStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const strings = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
    return strings.length > 0 ? [...new Set(strings)] : [];
}

function parseStoredState(value: unknown): StoredConversationUiState {
    if (!isRecord(value)) {
        return {};
    }

    const scopeFilter = parseScopeFilter(value['scopeFilter']);
    const workspaceFilter = parseOptionalString(value['workspaceFilter']);
    const sort = parseThreadSort(value['sort']);
    const showAllModes = parseOptionalBoolean(value['showAllModes']);
    const groupView = parseThreadGroupView(value['groupView']);
    const selectedThreadId = parseOptionalString(value['selectedThreadId']);
    const selectedSessionId = parseOptionalString(value['selectedSessionId']);
    const selectedRunId = parseOptionalString(value['selectedRunId']);
    const selectedTagIds = parseOptionalStringArray(value['selectedTagIds']);

    return {
        ...(scopeFilter ? { scopeFilter } : {}),
        ...(workspaceFilter ? { workspaceFilter } : {}),
        ...(sort ? { sort } : {}),
        ...(showAllModes !== undefined ? { showAllModes } : {}),
        ...(groupView ? { groupView } : {}),
        ...(selectedThreadId ? { selectedThreadId } : {}),
        ...(selectedSessionId ? { selectedSessionId } : {}),
        ...(selectedRunId ? { selectedRunId } : {}),
        ...(selectedTagIds ? { selectedTagIds } : {}),
    };
}

export interface ConversationUiState {
    scopeFilter: ScopeFilter;
    workspaceFilter: string | undefined;
    sort: ThreadSort | null;
    showAllModes: boolean;
    groupView: ThreadGroupView;
    selectedThreadId: string | undefined;
    selectedSessionId: string | undefined;
    selectedRunId: string | undefined;
    selectedTagIds: string[];
    setScopeFilter: Dispatch<SetStateAction<ScopeFilter>>;
    setWorkspaceFilter: Dispatch<SetStateAction<string | undefined>>;
    setSort: Dispatch<SetStateAction<ThreadSort | null>>;
    setShowAllModes: Dispatch<SetStateAction<boolean>>;
    setGroupView: Dispatch<SetStateAction<ThreadGroupView>>;
    setSelectedThreadId: Dispatch<SetStateAction<string | undefined>>;
    setSelectedSessionId: Dispatch<SetStateAction<string | undefined>>;
    setSelectedRunId: Dispatch<SetStateAction<string | undefined>>;
    setSelectedTagIds: Dispatch<SetStateAction<string[]>>;
}

function readStoredState(profileId: string): StoredConversationUiState {
    if (typeof window === 'undefined') {
        return {};
    }

    const key = `neonconductor.conversation.ui.${profileId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
        return {};
    }

    try {
        return parseStoredState(JSON.parse(raw));
    } catch {
        return {};
    }
}

function persistState(profileId: string, input: StoredConversationUiState): void {
    if (typeof window === 'undefined') {
        return;
    }

    const key = `neonconductor.conversation.ui.${profileId}`;
    window.localStorage.setItem(key, JSON.stringify(input));
}

export function useConversationUiState(profileId: string): ConversationUiState {
    const stored = readStoredState(profileId);

    const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(stored.scopeFilter ?? 'all');
    const [workspaceFilter, setWorkspaceFilter] = useState<string | undefined>(stored.workspaceFilter);
    const [sort, setSort] = useState<ThreadSort | null>(stored.sort ?? null);
    const [showAllModes, setShowAllModes] = useState<boolean>(stored.showAllModes ?? false);
    const [groupView, setGroupView] = useState<ThreadGroupView>(stored.groupView ?? 'workspace');
    const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(stored.selectedThreadId);
    const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(stored.selectedSessionId);
    const [selectedRunId, setSelectedRunId] = useState<string | undefined>(stored.selectedRunId);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(stored.selectedTagIds ?? []);
    const [hydratedProfileId, setHydratedProfileId] = useState(profileId);

    useEffect(() => {
        if (profileId === hydratedProfileId) {
            return;
        }

        const nextStored = readStoredState(profileId);
        setScopeFilter(nextStored.scopeFilter ?? 'all');
        setWorkspaceFilter(nextStored.workspaceFilter);
        setSort(nextStored.sort ?? null);
        setShowAllModes(nextStored.showAllModes ?? false);
        setGroupView(nextStored.groupView ?? 'workspace');
        setSelectedThreadId(nextStored.selectedThreadId);
        setSelectedSessionId(nextStored.selectedSessionId);
        setSelectedRunId(nextStored.selectedRunId);
        setSelectedTagIds(nextStored.selectedTagIds ?? []);
        setHydratedProfileId(profileId);
    }, [hydratedProfileId, profileId]);

    useEffect(() => {
        if (hydratedProfileId !== profileId) {
            return;
        }

        persistState(profileId, {
            scopeFilter,
            ...(workspaceFilter ? { workspaceFilter } : {}),
            ...(sort ? { sort } : {}),
            showAllModes,
            groupView,
            ...(selectedThreadId ? { selectedThreadId } : {}),
            ...(selectedSessionId ? { selectedSessionId } : {}),
            ...(selectedRunId ? { selectedRunId } : {}),
            selectedTagIds,
        });
    }, [
        profileId,
        scopeFilter,
        workspaceFilter,
        sort,
        showAllModes,
        groupView,
        selectedThreadId,
        selectedSessionId,
        selectedRunId,
        selectedTagIds,
        hydratedProfileId,
    ]);

    return {
        scopeFilter,
        workspaceFilter,
        sort,
        showAllModes,
        groupView,
        selectedThreadId,
        selectedSessionId,
        selectedRunId,
        selectedTagIds,
        setScopeFilter,
        setWorkspaceFilter,
        setSort,
        setShowAllModes,
        setGroupView,
        setSelectedThreadId,
        setSelectedSessionId,
        setSelectedRunId,
        setSelectedTagIds,
    };
}
