import type { WorkspaceAppSection } from '@/web/components/runtime/workspaceSurfaceModel';

const APP_SECTIONS: Array<{ id: WorkspaceAppSection; label: string; description: string }> = [
    { id: 'sessions', label: 'Sessions', description: 'Conversations, runs, and live work.' },
    { id: 'workspaces', label: 'Workspaces', description: 'Registered roots, worktrees, and local context.' },
    { id: 'settings', label: 'Settings', description: 'Providers, profiles, context, and app defaults.' },
];

interface WorkspaceAppRailProps {
    appSection: WorkspaceAppSection;
    onSectionChange: (section: WorkspaceAppSection) => void;
}

export function WorkspaceAppRail({ appSection, onSectionChange }: WorkspaceAppRailProps) {
    return (
        <aside className='border-border/70 bg-card/45 flex w-[220px] shrink-0 flex-col gap-4 border-r p-4'>
            <div className='space-y-1'>
                <p className='text-[11px] font-semibold tracking-[0.14em] uppercase'>Navigation</p>
                <p className='text-muted-foreground text-xs'>Move between sessions, workspaces, and settings.</p>
            </div>

            <nav aria-label='App sections' className='space-y-2'>
                {APP_SECTIONS.map((section) => (
                    <button
                        key={section.id}
                        type='button'
                        className={`w-full rounded-[22px] border px-3 py-3 text-left transition-colors ${
                            section.id === appSection
                                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                : 'border-border bg-background hover:bg-accent'
                        }`}
                        onClick={() => {
                            onSectionChange(section.id);
                        }}>
                        <p className='text-sm font-semibold'>{section.label}</p>
                        <p className='text-muted-foreground mt-1 text-xs leading-5'>{section.description}</p>
                    </button>
                ))}
            </nav>
        </aside>
    );
}
