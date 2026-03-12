import { Star, Trash2 } from 'lucide-react';
import { useDeferredValue, useId, useRef, useState } from 'react';

import { useConversationSidebarState } from '@/web/components/conversation/hooks/useConversationSidebarState';
import { buildConversationSidebarModel } from '@/web/components/conversation/sidebar/sidebarModel';
import { Button } from '@/web/components/ui/button';
import { DialogSurface } from '@/web/components/ui/dialogSurface';

import type { ConversationRecord, TagRecord, ThreadListRecord } from '@/app/backend/persistence/types';

import type { TopLevelTab } from '@/shared/contracts';

interface CreateThreadInput {
    scope: 'detached' | 'workspace';
    workspacePath?: string;
    title: string;
}

interface ConversationSidebarProps {
    buckets: ConversationRecord[];
    threads: ThreadListRecord[];
    tags: TagRecord[];
    threadTagIdsByThread: Map<string, string[]>;
    topLevelTab: TopLevelTab;
    selectedThreadId?: string;
    selectedTagIds: string[];
    scopeFilter: 'all' | 'workspace' | 'detached';
    workspaceFilter?: string;
    sort: 'latest' | 'alphabetical';
    showAllModes: boolean;
    groupView: 'workspace' | 'branch';
    isCreatingThread: boolean;
    isAddingTag: boolean;
    feedbackMessage?: string;
    statusMessage?: string;
    statusTone?: 'info' | 'error';
    onTopLevelTabChange: (topLevelTab: TopLevelTab) => void;
    onSelectThread: (threadId: string) => void;
    onPreviewThread?: (threadId: string) => void;
    onToggleTagFilter: (tagId: string) => void;
    onToggleThreadFavorite: (threadId: string, nextFavorite: boolean) => void;
    onRequestWorkspaceDelete: (workspaceFingerprint: string, workspaceLabel: string) => void;
    onScopeFilterChange: (scope: 'all' | 'workspace' | 'detached') => void;
    onWorkspaceFilterChange: (workspaceFingerprint?: string) => void;
    onSortChange: (sort: 'latest' | 'alphabetical') => void;
    onShowAllModesChange: (showAllModes: boolean) => void;
    onGroupViewChange: (groupView: 'workspace' | 'branch') => void;
    onCreateThread: (input: CreateThreadInput) => Promise<void>;
    onAddTagToThread: (threadId: string, label: string) => Promise<void>;
}

const TAB_OPTIONS: Array<{ id: TopLevelTab; label: string }> = [
    { id: 'chat', label: 'Chat' },
    { id: 'agent', label: 'Agent' },
    { id: 'orchestrator', label: 'Orchestrator' },
];

function modeBadgeClass(topLevelTab: TopLevelTab): string {
    if (topLevelTab === 'chat') {
        return 'border-sky-500/30 bg-sky-500/10 text-sky-700';
    }
    if (topLevelTab === 'agent') {
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
    }
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
}

function modeLabel(topLevelTab: TopLevelTab): string {
    if (topLevelTab === 'chat') {
        return 'Chat';
    }
    if (topLevelTab === 'agent') {
        return 'Agent';
    }
    return 'Orchestrator';
}

function matchesThreadSearch(thread: ThreadListRecord, searchValue: string): boolean {
    if (searchValue.length === 0) {
        return true;
    }

    const haystack = [
        thread.title,
        thread.anchorId ?? '',
        thread.workspaceFingerprint ?? '',
        thread.topLevelTab,
    ]
        .join(' ')
        .toLowerCase();

    return haystack.includes(searchValue);
}

export function ConversationSidebar({
    buckets,
    threads,
    tags,
    threadTagIdsByThread,
    topLevelTab,
    selectedThreadId,
    selectedTagIds,
    scopeFilter,
    workspaceFilter,
    sort,
    showAllModes,
    groupView,
    isCreatingThread,
    isAddingTag,
    feedbackMessage,
    statusMessage,
    statusTone = 'info',
    onTopLevelTabChange,
    onSelectThread,
    onPreviewThread,
    onToggleTagFilter,
    onToggleThreadFavorite,
    onRequestWorkspaceDelete,
    onScopeFilterChange,
    onWorkspaceFilterChange,
    onSortChange,
    onShowAllModesChange,
    onGroupViewChange,
    onCreateThread,
    onAddTagToThread,
}: ConversationSidebarProps) {
    const {
        newThreadTitle,
        setNewThreadTitle,
        newThreadScope,
        setNewThreadScope,
        newThreadWorkspace,
        setNewThreadWorkspace,
        newTagLabel,
        setNewTagLabel,
        createThread,
        addTagToThread,
    } = useConversationSidebarState({
        topLevelTab,
        isCreatingThread,
        isAddingTag,
        onCreateThread,
        onAddTagToThread,
    });
    const [searchValue, setSearchValue] = useState('');
    const [isThreadComposerOpen, setIsThreadComposerOpen] = useState(false);
    const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());
    const newThreadTitleInputRef = useRef<HTMLInputElement>(null);
    const dialogTitleId = useId();
    const dialogDescriptionId = useId();
    const visibleThreads = threads.filter((thread) => matchesThreadSearch(thread, deferredSearchValue));
    const selectedThread = threads.find((thread) => thread.id === selectedThreadId);

    const { workspaceOptions, tagLabelById, groupedThreadRows } = buildConversationSidebarModel({
        buckets,
        threads: visibleThreads,
        tags,
        groupView,
        ...(selectedThreadId ? { selectedThreadId } : {}),
    });

    const resultsLabel =
        deferredSearchValue.length > 0
            ? `${String(groupedThreadRows.reduce((count, group) => count + group.rows.length, 0))} matches`
            : `${String(visibleThreads.length)} threads`;

    return (
        <>
            <aside className='border-border/70 bg-card/40 flex min-h-0 w-[272px] flex-col border-r xl:w-[288px]'>
                <div className='border-border/70 space-y-4 border-b p-4'>
                    <div className='flex flex-wrap gap-2'>
                        {TAB_OPTIONS.map((tab) => (
                            <button
                                key={tab.id}
                                type='button'
                                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                                    tab.id === topLevelTab
                                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                        : 'border-border bg-card/80 hover:bg-accent'
                                }`}
                                onClick={() => {
                                    onTopLevelTabChange(tab.id);
                                }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                            <p className='text-sm font-semibold'>Threads</p>
                            <p className='text-muted-foreground text-xs'>
                                Search first, then branch only when the workspace actually needs it.
                            </p>
                        </div>
                        <Button
                            type='button'
                            size='sm'
                            onClick={() => {
                                setIsThreadComposerOpen(true);
                            }}>
                            New
                        </Button>
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

                    <div className='space-y-2'>
                        <input
                            aria-label='Search threads'
                            name='threadSearch'
                            value={searchValue}
                            onChange={(event) => {
                                setSearchValue(event.target.value);
                            }}
                            className='border-border bg-background h-10 w-full rounded-2xl border px-3 text-sm'
                            autoComplete='off'
                            placeholder='Search threads, workspaces, or tabs…'
                        />

                        <div className='grid grid-cols-[minmax(0,1fr)_112px] gap-2'>
                            <div className='grid grid-cols-3 gap-2'>
                                <Button
                                    type='button'
                                    size='sm'
                                    variant={scopeFilter === 'all' ? 'secondary' : 'outline'}
                                    onClick={() => {
                                        onScopeFilterChange('all');
                                    }}>
                                    All
                                </Button>
                                <Button
                                    type='button'
                                    size='sm'
                                    variant={scopeFilter === 'workspace' ? 'secondary' : 'outline'}
                                    onClick={() => {
                                        onScopeFilterChange('workspace');
                                    }}>
                                    Workspace
                                </Button>
                                <Button
                                    type='button'
                                    size='sm'
                                    variant={scopeFilter === 'detached' ? 'secondary' : 'outline'}
                                    onClick={() => {
                                        onScopeFilterChange('detached');
                                    }}>
                                    Playground
                                </Button>
                            </div>

                            <select
                                aria-label='Sort threads'
                                className='border-border bg-background h-8 rounded-xl border px-3 text-sm'
                                value={sort}
                                onChange={(event) => {
                                    onSortChange(event.target.value === 'alphabetical' ? 'alphabetical' : 'latest');
                                }}>
                                <option value='latest'>Latest</option>
                                <option value='alphabetical'>A-Z</option>
                            </select>
                        </div>
                    </div>

                    <details className='rounded-2xl border border-border/70 bg-background/50 px-3 py-2'>
                        <summary className='flex cursor-pointer list-none items-center justify-between gap-3 py-1'>
                            <div>
                                <p className='text-sm font-medium'>Filters</p>
                                <p className='text-muted-foreground text-xs'>
                                    {resultsLabel} · tags and branch grouping stay optional.
                                </p>
                            </div>
                            <span className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>
                                Toggle
                            </span>
                        </summary>

                        <div className='mt-3 space-y-3'>
                            <div className='grid grid-cols-2 gap-2'>
                                <Button
                                    type='button'
                                    size='sm'
                                    variant={showAllModes ? 'secondary' : 'outline'}
                                    onClick={() => {
                                        onShowAllModesChange(!showAllModes);
                                    }}>
                                    {showAllModes ? 'Mixed Tabs' : 'Current Tab'}
                                </Button>
                                <select
                                    aria-label='Conversation grouping'
                                    className='border-border bg-background h-8 rounded-xl border px-3 text-sm'
                                    value={groupView}
                                    onChange={(event) => {
                                        onGroupViewChange(event.target.value === 'branch' ? 'branch' : 'workspace');
                                    }}>
                                    <option value='workspace'>Workspace View</option>
                                    <option value='branch'>Branch View</option>
                                </select>
                            </div>

                            {scopeFilter === 'workspace' || workspaceFilter ? (
                                <select
                                    className='border-border bg-background h-8 w-full rounded-xl border px-3 text-sm'
                                    value={workspaceFilter ?? ''}
                                    onChange={(event) => {
                                        onWorkspaceFilterChange(event.target.value || undefined);
                                    }}>
                                    <option value=''>All workspaces</option>
                                    {workspaceOptions.map((workspace) => (
                                        <option key={workspace} value={workspace}>
                                            {workspace}
                                        </option>
                                    ))}
                                </select>
                            ) : null}

                            {tags.length > 0 ? (
                                <div className='space-y-2'>
                                    <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                                        Tags
                                    </p>
                                    <div className='flex flex-wrap gap-1.5'>
                                        {tags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                type='button'
                                                className={`focus-visible:ring-ring rounded-md border px-2 py-1 text-xs focus-visible:ring-2 ${
                                                    selectedTagIds.includes(tag.id)
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'border-border bg-background text-foreground'
                                                }`}
                                                onClick={() => {
                                                    onToggleTagFilter(tag.id);
                                                }}>
                                                {tag.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {selectedThread ? (
                                <div className='space-y-2'>
                                    <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                                        Add Tag To Selected Thread
                                    </p>
                                    <div className='flex items-center gap-2'>
                                        <input
                                            aria-label='Add tag to selected thread'
                                            name='newThreadTag'
                                            value={newTagLabel}
                                            onChange={(event) => {
                                                setNewTagLabel(event.target.value);
                                            }}
                                            className='border-border bg-background h-8 min-w-0 flex-1 rounded-xl border px-3 text-xs'
                                            autoComplete='off'
                                            placeholder='Tag label…'
                                        />
                                        <Button
                                            type='button'
                                            size='sm'
                                            variant='outline'
                                            disabled={isAddingTag}
                                            onClick={() => {
                                                void addTagToThread(selectedThread.id);
                                            }}>
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </details>
                </div>

                <div className='min-h-0 flex-1 overflow-y-auto p-3'>
                    {groupedThreadRows.length === 0 ? (
                        <div className='text-muted-foreground flex h-full min-h-48 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-background/30 px-6 text-center text-sm'>
                            {statusMessage && statusTone !== 'error'
                                ? 'The rail is still loading. The center workspace is ready to use.'
                                : statusTone === 'error'
                                  ? 'Conversation lists could not be loaded yet. Keep working in the current shell.'
                                  : deferredSearchValue.length > 0
                                  ? 'No threads match that search yet.'
                                    : 'No conversations are available yet.'}
                        </div>
                    ) : null}
                    {groupedThreadRows.map((group) => {
                        const workspaceFingerprint = group.workspaceFingerprint;

                        return (
                            <section key={group.label} className='mb-4'>
                                <div className='text-muted-foreground flex items-center justify-between gap-2 px-1 pb-1'>
                                    <p className='min-w-0 truncate text-[11px] font-semibold tracking-wide uppercase'>
                                        {group.label}
                                    </p>
                                    {workspaceFingerprint ? (
                                        <button
                                            type='button'
                                            className='hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring rounded-md p-1 transition-colors focus-visible:ring-2'
                                            aria-label={`Clear threads for ${group.label}`}
                                            onClick={() => {
                                                onRequestWorkspaceDelete(workspaceFingerprint, group.label);
                                            }}>
                                            <Trash2 className='h-3.5 w-3.5' />
                                        </button>
                                    ) : null}
                                </div>
                                <div className='space-y-2'>
                                    {group.rows.map(({ thread, depth }) => {
                                        const tagIds = threadTagIdsByThread.get(thread.id) ?? [];
                                        return (
                                            <div key={thread.id} className='relative'>
                                                {groupView === 'branch' && depth > 0 ? (
                                                    <span
                                                        aria-hidden
                                                        className='bg-border absolute top-2 bottom-2 w-px'
                                                        style={{ left: `${String(depth * 14 - 7)}px` }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`border-border bg-background hover:bg-accent/80 flex items-start gap-2 rounded-3xl border p-3 transition-colors ${
                                                        selectedThreadId === thread.id
                                                            ? 'border-primary bg-primary/8 shadow-sm'
                                                            : ''
                                                    }`}
                                                    style={{ paddingLeft: `${String(depth * 14 + 10)}px` }}>
                                                    <button
                                                        type='button'
                                                        className='focus-visible:ring-ring min-w-0 flex-1 rounded-md text-left focus-visible:ring-2'
                                                        onMouseEnter={() => {
                                                            onPreviewThread?.(thread.id);
                                                        }}
                                                        onFocus={() => {
                                                            onPreviewThread?.(thread.id);
                                                        }}
                                                        onClick={() => {
                                                            onSelectThread(thread.id);
                                                        }}>
                                                        <div className='flex items-center justify-between gap-2'>
                                                            <p className='truncate text-sm font-medium'>{thread.title}</p>
                                                            {showAllModes ? (
                                                                <span
                                                                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${modeBadgeClass(
                                                                        thread.topLevelTab
                                                                    )}`}>
                                                                    {modeLabel(thread.topLevelTab)}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className='text-muted-foreground mt-1 text-xs leading-5'>
                                                            {thread.anchorKind === 'workspace'
                                                                ? thread.topLevelTab === 'chat'
                                                                    ? 'Workspace conversation'
                                                                    : thread.worktreeId
                                                                      ? 'Managed worktree execution'
                                                                      : thread.executionEnvironmentMode === 'new_worktree'
                                                                        ? 'Queued worktree execution'
                                                                        : 'Local workspace execution'
                                                                : 'Playground conversation'}
                                                        </p>
                                                        {tagIds.length > 0 ? (
                                                            <div className='mt-2 flex flex-wrap gap-1'>
                                                                {tagIds.map((tagId) => (
                                                                    <span
                                                                        key={tagId}
                                                                        className='bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[10px]'>
                                                                        {tagLabelById.get(tagId) ?? tagId}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className={`focus-visible:ring-ring mt-0.5 rounded-md p-1 transition-colors focus-visible:ring-2 ${
                                                            thread.isFavorite
                                                                ? 'text-amber-400 hover:text-amber-300'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                        aria-label={
                                                            thread.isFavorite
                                                                ? `Remove ${thread.title} from favorites`
                                                                : `Add ${thread.title} to favorites`
                                                        }
                                                        onClick={() => {
                                                            onToggleThreadFavorite(thread.id, !thread.isFavorite);
                                                        }}>
                                                        <Star
                                                            className={`h-4 w-4 ${thread.isFavorite ? 'fill-current' : ''}`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </aside>

            <DialogSurface
                open={isThreadComposerOpen}
                titleId={dialogTitleId}
                descriptionId={dialogDescriptionId}
                initialFocusRef={newThreadTitleInputRef}
                onClose={() => {
                    setIsThreadComposerOpen(false);
                }}>
                <div className='border-border bg-background w-[min(92vw,28rem)] rounded-[28px] border p-5 shadow-xl'>
                    <div className='space-y-1'>
                        <h2 id={dialogTitleId} className='text-lg font-semibold'>
                            New thread
                        </h2>
                        <p id={dialogDescriptionId} className='text-muted-foreground text-sm'>
                            Create the thread here, then keep the rail focused on navigation.
                        </p>
                    </div>

                    <div className='mt-4 space-y-3'>
                        <input
                            ref={newThreadTitleInputRef}
                            aria-label='Thread title'
                            name='newThreadTitle'
                            value={newThreadTitle}
                            onChange={(event) => {
                                setNewThreadTitle(event.target.value);
                            }}
                            className='border-border bg-card h-10 w-full rounded-2xl border px-3 text-sm'
                            autoComplete='off'
                            placeholder='Optional thread title…'
                        />
                        <div className='grid grid-cols-2 gap-2'>
                            <select
                                aria-label='Thread scope'
                                className='border-border bg-card h-10 rounded-2xl border px-3 text-sm'
                                value={newThreadScope}
                                onChange={(event) => {
                                    setNewThreadScope(event.target.value === 'workspace' ? 'workspace' : 'detached');
                                }}>
                                <option value='detached'>Playground</option>
                                <option value='workspace'>Workspace</option>
                            </select>
                            <Button
                                type='button'
                                disabled={isCreatingThread || (newThreadScope === 'detached' && topLevelTab !== 'chat')}
                                onClick={() => {
                                    void createThread().then(() => {
                                        setIsThreadComposerOpen(false);
                                    });
                                }}>
                                Create thread
                            </Button>
                        </div>
                        {newThreadScope === 'workspace' ? (
                            <input
                                aria-label='Workspace path'
                                name='newThreadWorkspace'
                                value={newThreadWorkspace}
                                onChange={(event) => {
                                    setNewThreadWorkspace(event.target.value);
                                }}
                                className='border-border bg-card h-10 w-full rounded-2xl border px-3 text-sm'
                                autoComplete='off'
                                placeholder='Workspace path…'
                            />
                        ) : null}
                        {newThreadScope === 'detached' && topLevelTab !== 'chat' ? (
                            <p className='text-muted-foreground text-xs'>Playground threads are only available in chat.</p>
                        ) : null}
                    </div>

                    <div className='mt-5 flex justify-end gap-2'>
                        <Button
                            type='button'
                            variant='ghost'
                            onClick={() => {
                                setIsThreadComposerOpen(false);
                            }}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogSurface>
        </>
    );
}
