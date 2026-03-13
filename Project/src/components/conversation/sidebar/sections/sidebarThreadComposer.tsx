import { useId, useRef, useState } from 'react';

import { useConversationSidebarState } from '@/web/components/conversation/hooks/useConversationSidebarState';
import { Button } from '@/web/components/ui/button';
import { DialogSurface } from '@/web/components/ui/dialogSurface';

import type { TopLevelTab } from '@/shared/contracts';

interface SidebarThreadComposerProps {
    topLevelTab: TopLevelTab;
    workspaceRoots: Array<{
        fingerprint: string;
        label: string;
        absolutePath: string;
    }>;
    preferredWorkspaceFingerprint?: string;
    isCreatingThread: boolean;
    onCreateThread: (input: { scope: 'detached' | 'workspace'; workspacePath?: string; title: string }) => Promise<void>;
}

export function SidebarThreadComposer({
    topLevelTab,
    workspaceRoots,
    preferredWorkspaceFingerprint,
    isCreatingThread,
    onCreateThread,
}: SidebarThreadComposerProps) {
    const {
        newThreadTitle,
        setNewThreadTitle,
        newThreadScope,
        setNewThreadScope,
        newThreadWorkspaceFingerprint,
        setNewThreadWorkspaceFingerprint,
        createThread,
    } = useConversationSidebarState({
        topLevelTab,
        isCreatingThread,
        workspaceRoots: workspaceRoots.map((workspaceRoot) => ({
            fingerprint: workspaceRoot.fingerprint,
            absolutePath: workspaceRoot.absolutePath,
        })),
        ...(preferredWorkspaceFingerprint ? { preferredWorkspaceFingerprint } : {}),
        onCreateThread,
    });
    const [isOpen, setIsOpen] = useState(false);
    const newThreadTitleInputRef = useRef<HTMLInputElement>(null);
    const dialogTitleId = useId();
    const dialogDescriptionId = useId();
    const requiresWorkspace = topLevelTab !== 'chat';
    const workspaceSelectionValue = newThreadScope === 'workspace' ? newThreadWorkspaceFingerprint ?? '' : 'detached';
    const canCreateWorkspaceConversation = workspaceRoots.length > 0 && Boolean(newThreadWorkspaceFingerprint);
    const createBlockedByWorkspace = requiresWorkspace && !canCreateWorkspaceConversation;

    return (
        <>
            <Button
                type='button'
                size='sm'
                onClick={() => {
                    setIsOpen(true);
                }}>
                New
            </Button>

            <DialogSurface
                open={isOpen}
                titleId={dialogTitleId}
                descriptionId={dialogDescriptionId}
                initialFocusRef={newThreadTitleInputRef}
                onClose={() => {
                    setIsOpen(false);
                }}>
                <div className='border-border bg-background w-[min(92vw,28rem)] rounded-[28px] border p-5 shadow-xl'>
                    <div className='space-y-1'>
                        <h2 id={dialogTitleId} className='text-lg font-semibold'>
                            New conversation
                        </h2>
                        <p id={dialogDescriptionId} className='text-muted-foreground text-sm'>
                            Choose the workspace context first, then create the conversation from the sessions surface.
                        </p>
                    </div>

                    <div className='mt-4 space-y-3'>
                        <div className='space-y-1.5'>
                            <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>
                                Workspace context
                            </label>
                            <select
                                aria-label='Conversation workspace context'
                                className='border-border bg-card h-10 w-full rounded-2xl border px-3 text-sm'
                                value={workspaceSelectionValue}
                                onChange={(event) => {
                                    if (event.target.value === 'detached') {
                                        setNewThreadScope('detached');
                                        return;
                                    }

                                    setNewThreadScope('workspace');
                                    setNewThreadWorkspaceFingerprint(event.target.value || undefined);
                                }}>
                                {!requiresWorkspace ? <option value='detached'>Playground conversation</option> : null}
                                {requiresWorkspace && workspaceRoots.length === 0 ? (
                                    <option value=''>No workspace registered yet</option>
                                ) : null}
                                {workspaceRoots.map((workspaceRoot) => (
                                    <option key={workspaceRoot.fingerprint} value={workspaceRoot.fingerprint}>
                                        {workspaceRoot.label}
                                    </option>
                                ))}
                            </select>
                            {createBlockedByWorkspace ? (
                                <p className='text-muted-foreground text-xs'>
                                    Register a workspace first. Agent and orchestrator conversations stay workspace-scoped.
                                </p>
                            ) : null}
                        </div>

                        <div className='space-y-1.5'>
                            <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>
                                Mode
                            </label>
                            <div className='border-border bg-card flex h-10 items-center rounded-2xl border px-3 text-sm'>
                                {topLevelTab === 'chat'
                                    ? 'Chat'
                                    : topLevelTab === 'agent'
                                      ? 'Agent'
                                      : 'Orchestrator'}
                            </div>
                        </div>

                        <div className='space-y-1.5'>
                            <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase'>
                                Title
                            </label>
                            <input
                                ref={newThreadTitleInputRef}
                                aria-label='Conversation title'
                                name='newThreadTitle'
                                value={newThreadTitle}
                                onChange={(event) => {
                                    setNewThreadTitle(event.target.value);
                                }}
                                className='border-border bg-card h-10 w-full rounded-2xl border px-3 text-sm'
                                autoComplete='off'
                                placeholder='Optional conversation title…'
                            />
                        </div>

                        {!requiresWorkspace && newThreadScope === 'detached' ? (
                            <p className='text-muted-foreground text-xs'>
                                Playground conversations stay available in chat only.
                            </p>
                        ) : null}
                    </div>

                    <div className='mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4'>
                        <p className='text-muted-foreground text-xs'>Primary actions stay at the bottom of the section they submit.</p>
                        <div className='flex gap-2'>
                            <Button
                                type='button'
                                variant='ghost'
                                onClick={() => {
                                    setIsOpen(false);
                                }}>
                                Cancel
                            </Button>
                            <Button
                                type='button'
                                disabled={isCreatingThread || createBlockedByWorkspace}
                                onClick={() => {
                                    void createThread().then(() => {
                                        setIsOpen(false);
                                    });
                                }}>
                                Create conversation
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogSurface>
        </>
    );
}
