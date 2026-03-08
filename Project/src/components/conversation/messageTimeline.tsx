import { Copy } from 'lucide-react';
import { useState } from 'react';

import { MarkdownContent } from '@/web/components/content/markdown/markdownContent';
import type { MessageTimelineEntry } from '@/web/components/conversation/messageTimelineModel';
import { Button } from '@/web/components/ui/button';
import { copyText } from '@/web/lib/copy';

interface MessageTimelineItemProps {
    entry: MessageTimelineEntry;
    canBranch: boolean;
    onEditMessage?: (entry: MessageTimelineEntry) => void;
    onBranchFromMessage?: (entry: MessageTimelineEntry) => void;
}

export function MessageTimelineEmptyState() {
    return (
        <div className='text-muted-foreground border-border bg-card/60 rounded-xl border p-5 text-sm'>
            No messages yet for this session. Start a run to populate the timeline.
        </div>
    );
}

export function MessageTimelineItem({
    entry,
    canBranch,
    onEditMessage,
    onBranchFromMessage,
}: MessageTimelineItemProps) {
    const canEdit = entry.role === 'user' && typeof entry.editableText === 'string' && entry.editableText.length > 0;
    const canCopy = typeof entry.plainCopyText === 'string' && entry.plainCopyText.length > 0;
    const [copyFeedback, setCopyFeedback] = useState<string | undefined>(undefined);

    async function handleCopy(sourceMode: 'plain' | 'raw') {
        const payload = sourceMode === 'raw' ? entry.rawCopyText : entry.plainCopyText;
        if (!payload) {
            return;
        }

        const copied = await copyText(payload);
        setCopyFeedback(copied ? (sourceMode === 'raw' ? 'Source copied' : 'Copied') : 'Copy failed');
        window.setTimeout(() => {
            setCopyFeedback(undefined);
        }, 1400);
    }

    return (
        <article className='border-border bg-card rounded-xl border p-4 shadow-sm'>
            <header className='mb-2 flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                    <span className='bg-secondary text-secondary-foreground rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                        {entry.role}
                    </span>
                    <span className='text-muted-foreground text-xs'>
                        {new Date(entry.createdAt).toLocaleTimeString()}
                    </span>
                </div>
                <div className='flex items-center gap-1'>
                    {copyFeedback ? <span className='text-muted-foreground px-1 text-[11px]'>{copyFeedback}</span> : null}
                    {canCopy ? (
                        <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            className='h-7 px-2 text-[11px]'
                            title='Copy rendered text. Shift-click to copy source markdown.'
                            aria-label='Copy message'
                            onClick={(event) => {
                                void handleCopy(event.shiftKey ? 'raw' : 'plain');
                            }}>
                            <Copy className='h-3.5 w-3.5' />
                            Copy
                        </Button>
                    ) : null}
                    {canEdit ? (
                        <div className='flex items-center gap-1'>
                            <button
                                type='button'
                                className='border-border bg-background hover:bg-accent rounded border px-2 py-0.5 text-[11px]'
                                onClick={() => {
                                    onEditMessage?.(entry);
                                }}>
                                Edit
                            </button>
                            {canBranch ? (
                                <button
                                    type='button'
                                    className='border-border bg-background hover:bg-accent rounded border px-2 py-0.5 text-[11px]'
                                    onClick={() => {
                                        onBranchFromMessage?.(entry);
                                    }}>
                                    Branch
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </header>
            <div className='space-y-3'>
                {entry.body.length > 0 ? (
                    entry.body.map((item) => (
                        <div key={item.id} className='space-y-2'>
                            {item.type === 'assistant_reasoning' ? (
                                <div className='text-primary inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase'>
                                    Reasoning
                                    {item.providerLimitedReasoning ? (
                                        <span className='text-muted-foreground text-[10px] tracking-normal lowercase'>
                                            provider-limited
                                        </span>
                                    ) : null}
                                </div>
                            ) : null}
                            <MarkdownContent markdown={item.text} />
                        </div>
                    ))
                ) : (
                    <p className='text-muted-foreground'>No renderable text payload.</p>
                )}
            </div>
        </article>
    );
}
