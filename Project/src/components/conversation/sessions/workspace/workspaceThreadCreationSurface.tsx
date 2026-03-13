import { Button } from '@/web/components/ui/button';

interface WorkspaceThreadCreationSurfaceProps {
    workspaceRoots: Array<{
        fingerprint: string;
        label: string;
    }>;
    workspaceFingerprint: string | undefined;
    title: string;
    isCreatingThread: boolean;
    onWorkspaceChange: (workspaceFingerprint: string | undefined) => void;
    onTitleChange: (title: string) => void;
    onCreateThread: () => void;
    onCancel: () => void;
    onNavigateToWorkspaces: () => void;
}

export function WorkspaceThreadCreationSurface({
    workspaceRoots,
    workspaceFingerprint,
    title,
    isCreatingThread,
    onWorkspaceChange,
    onTitleChange,
    onCreateThread,
    onCancel,
    onNavigateToWorkspaces,
}: WorkspaceThreadCreationSurfaceProps) {
    const hasWorkspaceOptions = workspaceRoots.length > 0;
    const createBlocked = !workspaceFingerprint;

    return (
        <div className='space-y-4'>
            <div className='space-y-1'>
                <h3 className='text-lg font-semibold'>New thread</h3>
                <p className='text-muted-foreground text-sm'>Pick the workspace here, then tune the run from the composer.</p>
            </div>

            <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>
                    Workspace
                </label>
                <select
                    aria-label='Thread workspace'
                    className='border-border bg-card h-10 w-full rounded-2xl border px-3 text-sm'
                    value={workspaceFingerprint ?? ''}
                    onChange={(event) => {
                        onWorkspaceChange(event.target.value || undefined);
                    }}>
                    {hasWorkspaceOptions ? null : <option value=''>No workspace registered yet</option>}
                    {workspaceRoots.map((workspaceRoot) => (
                        <option key={workspaceRoot.fingerprint} value={workspaceRoot.fingerprint}>
                            {workspaceRoot.label}
                        </option>
                    ))}
                </select>
                {!hasWorkspaceOptions ? (
                    <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/40 px-3 py-3'>
                        <p className='text-muted-foreground text-xs leading-5'>
                            Add a workspace first, then create the thread inside it.
                        </p>
                        <Button type='button' size='sm' onClick={onNavigateToWorkspaces}>
                            Add workspace
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>
                    Title
                </label>
                <input
                    type='text'
                    value={title}
                    onChange={(event) => {
                        onTitleChange(event.target.value);
                    }}
                    className='border-border bg-card h-10 w-full rounded-2xl border px-3 text-sm'
                    autoComplete='off'
                    placeholder='Optional thread title…'
                />
                <p className='text-muted-foreground text-xs'>
                    Mode, profile, model, and reasoning stay with the prompt box below.
                </p>
            </div>

            <div className='flex items-center justify-end gap-2 border-t border-border/70 pt-4'>
                <Button type='button' variant='ghost' onClick={onCancel}>
                    Cancel
                </Button>
                <Button type='button' disabled={isCreatingThread || createBlocked} onClick={onCreateThread}>
                    {isCreatingThread ? 'Creating…' : 'Create thread'}
                </Button>
            </div>
        </div>
    );
}
