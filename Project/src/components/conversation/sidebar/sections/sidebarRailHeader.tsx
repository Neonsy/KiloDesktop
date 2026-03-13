import type { ReactNode } from 'react';

interface SidebarRailHeaderProps {
    feedbackMessage?: string;
    statusMessage?: string;
    statusTone?: 'info' | 'error';
    threadComposerAction: ReactNode;
}

export function SidebarRailHeader({
    feedbackMessage,
    statusMessage,
    statusTone = 'info',
    threadComposerAction,
}: SidebarRailHeaderProps) {
    return (
        <div className='border-border/70 space-y-4 border-b p-4'>
            <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-sm font-semibold'>Threads</p>
                    <p className='text-muted-foreground text-xs'>
                        Search and filter here. Session mode now stays in the main workspace header.
                    </p>
                </div>
                {threadComposerAction}
            </div>

            {feedbackMessage ? (
                <div
                    aria-live='polite'
                    className='rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
                    {feedbackMessage}
                </div>
            ) : null}
            {statusMessage ? (
                <div
                    aria-live='polite'
                    className={`rounded-2xl px-3 py-2 text-xs ${
                        statusTone === 'error'
                            ? 'border border-destructive/20 bg-destructive/10 text-destructive'
                            : 'border border-border/70 bg-background/80 text-muted-foreground'
                    }`}>
                    {statusMessage}
                </div>
            ) : null}
        </div>
    );
}
