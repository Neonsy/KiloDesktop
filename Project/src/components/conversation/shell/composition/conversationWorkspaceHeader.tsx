import type { TopLevelTab } from '@/shared/contracts';

interface ConversationWorkspaceHeaderProps {
    threadTitle?: string;
    streamState: string;
    streamErrorMessage?: string | null;
    lastSequence: number;
    tabSwitchNotice?: string;
    topLevelTab: TopLevelTab;
    onTopLevelTabChange: (topLevelTab: TopLevelTab) => void;
}

const SESSION_MODE_OPTIONS: Array<{ id: TopLevelTab; label: string }> = [
    { id: 'chat', label: 'Chat' },
    { id: 'agent', label: 'Agent' },
    { id: 'orchestrator', label: 'Orchestrator' },
];

export function ConversationWorkspaceHeader({
    threadTitle,
    streamState,
    streamErrorMessage,
    lastSequence,
    tabSwitchNotice,
    topLevelTab,
    onTopLevelTabChange,
}: ConversationWorkspaceHeaderProps) {
    return (
        <header className='border-border flex items-center justify-between gap-4 border-b px-4 py-3'>
            <div className='min-w-0'>
                <p className='truncate text-sm font-semibold'>{threadTitle ?? 'No conversation selected'}</p>
                <p
                    className={`text-xs ${streamState === 'error' ? 'text-amber-300' : 'text-muted-foreground'}`}
                    title={streamErrorMessage ?? undefined}>
                    {streamState === 'error'
                        ? `Live updates degraded · retrying · Events: ${String(lastSequence)}`
                        : `Live updates: ${streamState} · Events: ${String(lastSequence)}`}
                </p>
                {tabSwitchNotice ? <p className='text-primary text-xs'>{tabSwitchNotice}</p> : null}
            </div>

            <div className='flex flex-wrap gap-2'>
                {SESSION_MODE_OPTIONS.map((mode) => (
                    <button
                        key={mode.id}
                        type='button'
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                            mode.id === topLevelTab
                                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                : 'border-border bg-card hover:bg-accent'
                        }`}
                        onClick={() => {
                            onTopLevelTabChange(mode.id);
                        }}>
                        {mode.label}
                    </button>
                ))}
            </div>
        </header>
    );
}
