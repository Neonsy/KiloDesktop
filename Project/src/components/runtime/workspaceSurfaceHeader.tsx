interface WorkspaceSurfaceHeaderProps {
    profiles: Array<{ id: string; name: string }>;
    resolvedProfileId: string | undefined;
    isSwitchingProfile: boolean;
    onProfileChange: (profileId: string) => void;
    onOpenSettings: () => void;
}

export function WorkspaceSurfaceHeader({
    profiles,
    resolvedProfileId,
    isSwitchingProfile,
    onProfileChange,
    onOpenSettings,
}: WorkspaceSurfaceHeaderProps) {
    return (
        <header className='border-border/80 bg-background/85 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-sm'>
            <div className='min-w-0'>
                <p className='text-[11px] font-semibold tracking-[0.14em] uppercase'>Workspace</p>
                <p className='text-muted-foreground text-xs'>
                    Primary navigation lives in the conversation rail. Settings stays modal.
                </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
                <span className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>Profile</span>
                <select
                    className='border-border bg-card h-9 min-w-[220px] rounded-full border px-3 text-sm'
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

                <button
                    type='button'
                    className='border-border bg-card hover:bg-accent rounded-full border px-3 py-1.5 text-sm font-medium'
                    onClick={onOpenSettings}>
                    Settings
                </button>
            </div>
        </header>
    );
}

