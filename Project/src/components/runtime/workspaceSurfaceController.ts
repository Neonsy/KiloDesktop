import { useEffect, useState } from 'react';

import { trpc } from '@/web/trpc/client';

import type { TopLevelTab } from '@/app/backend/runtime/contracts';

const FALLBACK_MODE_BY_TAB: Record<TopLevelTab, string> = {
    chat: 'chat',
    agent: 'code',
    orchestrator: 'plan',
};

const MISSING_PROFILE_ID = 'profile_missing';

function resolveActiveWorkspaceProfileId(input: {
    activeProfileId: string | undefined;
    serverActiveProfileId: string | undefined;
    profiles: Array<{ id: string; isActive: boolean }>;
}): string | undefined {
    if (input.activeProfileId && input.profiles.some((profile) => profile.id === input.activeProfileId)) {
        return input.activeProfileId;
    }

    if (input.serverActiveProfileId && input.profiles.some((profile) => profile.id === input.serverActiveProfileId)) {
        return input.serverActiveProfileId;
    }

    const flaggedActiveProfileId = input.profiles.find((profile) => profile.isActive)?.id;
    if (flaggedActiveProfileId) {
        return flaggedActiveProfileId;
    }

    return input.profiles[0]?.id;
}

async function refetchProfileQueries(input: {
    profileListQuery: ReturnType<typeof trpc.profile.list.useQuery>;
    activeProfileQuery: ReturnType<typeof trpc.profile.getActive.useQuery>;
}): Promise<void> {
    await Promise.all([input.profileListQuery.refetch(), input.activeProfileQuery.refetch()]);
}

export function useWorkspaceSurfaceController() {
    const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined);
    const [topLevelTab, setTopLevelTab] = useState<TopLevelTab>('chat');
    const [showSettings, setShowSettings] = useState(false);

    const profileListQuery = trpc.profile.list.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });
    const activeProfileQuery = trpc.profile.getActive.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const profiles = profileListQuery.data?.profiles ?? [];
    const resolvedProfileId = resolveActiveWorkspaceProfileId({
        activeProfileId,
        serverActiveProfileId: activeProfileQuery.data?.activeProfileId,
        profiles,
    });

    useEffect(() => {
        if (!resolvedProfileId || resolvedProfileId === activeProfileId) {
            return;
        }

        setActiveProfileId(resolvedProfileId);
    }, [activeProfileId, resolvedProfileId]);

    const profileSetActiveMutation = trpc.profile.setActive.useMutation({
        onSuccess: async (result) => {
            if (!result.updated) {
                return;
            }

            setActiveProfileId(result.profile.id);
            setTopLevelTab('chat');
            await refetchProfileQueries({
                profileListQuery,
                activeProfileQuery,
            });
        },
    });

    const modeListQuery = trpc.mode.list.useQuery(
        {
            profileId: resolvedProfileId ?? MISSING_PROFILE_ID,
            topLevelTab,
        },
        {
            enabled: Boolean(resolvedProfileId),
            refetchOnWindowFocus: false,
        }
    );
    const modeActiveQuery = trpc.mode.getActive.useQuery(
        {
            profileId: resolvedProfileId ?? MISSING_PROFILE_ID,
            topLevelTab,
        },
        {
            enabled: Boolean(resolvedProfileId),
            refetchOnWindowFocus: false,
        }
    );
    const setActiveModeMutation = trpc.mode.setActive.useMutation({
        onSuccess: () => {
            void modeListQuery.refetch();
            void modeActiveQuery.refetch();
        },
    });

    const modes = modeActiveQuery.data?.modes ?? modeListQuery.data?.modes ?? [];
    const activeModeKey = modeActiveQuery.data?.activeMode.modeKey ?? FALLBACK_MODE_BY_TAB[topLevelTab];

    return {
        profiles,
        resolvedProfileId,
        topLevelTab,
        setTopLevelTab,
        showSettings,
        setShowSettings,
        modes,
        activeModeKey,
        profileSetActiveMutation,
        setActiveModeMutation,
        setResolvedProfile: (profileId: string) => {
            setActiveProfileId(profileId);
            setTopLevelTab('chat');
            void refetchProfileQueries({
                profileListQuery,
                activeProfileQuery,
            });
        },
        selectProfile: async (profileId: string) => {
            if (!profileId || profileId === resolvedProfileId) {
                return;
            }

            await profileSetActiveMutation.mutateAsync({
                profileId,
            });
        },
        selectMode: async (modeKey: string) => {
            if (!modeKey || setActiveModeMutation.isPending || !resolvedProfileId) {
                return;
            }

            await setActiveModeMutation.mutateAsync({
                profileId: resolvedProfileId,
                topLevelTab,
                modeKey,
            });
        },
    };
}
