import PrivacyModeToggle from '@/web/components/window/privacyModeToggle';

import type { WorkspaceAppSection } from '@/web/components/runtime/workspaceSurfaceModel';

interface WorkspaceSurfaceHeaderProps {
    appSection: WorkspaceAppSection;
    profiles: Array<{ id: string; name: string }>;
    resolvedProfileId: string | undefined;
    isSwitchingProfile: boolean;
    workspaceOptions: Array<{ fingerprint: string; label: string }>;
    selectedWorkspaceFingerprint: string | undefined;
    onProfileChange: (profileId: string) => void;
    onWorkspaceChange: (workspaceFingerprint: string | undefined) => void;
    onOpenCommandPalette: () => void;
}

function sectionLabel(section: WorkspaceAppSection): string {
    if (section === 'workspaces') {
        return 'Workspaces';
    }
    if (section === 'settings') {
        return 'Settings';
    }
    return 'Sessions';
}

export function WorkspaceSurfaceHeader({
    appSection,
    profiles,
    resolvedProfileId,
    isSwitchingProfile,
    workspaceOptions,
    selectedWorkspaceFingerprint,
    onProfileChange,
    onWorkspaceChange,
    onOpenCommandPalette,
}: WorkspaceSurfaceHeaderProps) {
    return (
        <header className='border-border/80 bg-background/88 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-sm'>
            <div className='min-w-0'>
                <p className='text-[11px] font-semibold tracking-[0.14em] uppercase'>NeonConductor</p>
                <p className='text-muted-foreground text-xs'>
                    {sectionLabel(appSection)} · workspace-first command surface
                </p>
            </div>

            <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>
                    <span className='sr-only'>Workspace</span>
                    <select
                        className='border-border bg-card h-9 min-w-[200px] rounded-full border px-3 text-sm'
                        value={selectedWorkspaceFingerprint ?? ''}
                        onChange={(event) => {
                            const nextValue = event.target.value.trim();
                            onWorkspaceChange(nextValue.length > 0 ? nextValue : undefined);
                        }}>
                        <option value=''>All workspaces</option>
                        {workspaceOptions.map((workspace) => (
                            <option key={workspace.fingerprint} value={workspace.fingerprint}>
                                {workspace.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>
                    <span className='sr-only'>Profile</span>
                    <select
                        className='border-border bg-card h-9 min-w-[200px] rounded-full border px-3 text-sm'
                        value={resolvedProfileId ?? ''}
                        disabled={!resolvedProfileId || isSwitchingProfile}
                        onChange={(event) => {
                            onProfileChange(event.target.value.trim());
                        }}>
                        {profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                                {profile.name}
                            </option>
                        ))}
                    </select>
                </label>

                <button
                    type='button'
                    className='border-border bg-card hover:bg-accent rounded-full border px-3 py-1.5 text-sm font-medium'
                    onClick={onOpenCommandPalette}>
                    Search · Cmd/Ctrl+K
                </button>

                <PrivacyModeToggle />
            </div>
        </header>
    );
}
