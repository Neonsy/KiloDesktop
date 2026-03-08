import { describe, expect, it } from 'vitest';

import {
    registerPersistenceStoreHooks,
    checkpointStore,
    conversationStore,
    diffStore,
    getDefaultProfileId,
    runStore,
    sessionHistoryService,
    sessionStore,
    tagStore,
    threadStore,
} from '@/app/backend/persistence/__tests__/stores.shared';

registerPersistenceStoreHooks();

describe('persistence stores: conversation domain', () => {
    it('supports session store lifecycle CRUD-style flows', async () => {
        const profileId = getDefaultProfileId();
        const bucket = await conversationStore.createOrGetBucket({
            profileId,
            scope: 'detached',
            title: 'Detached',
        });
        if (bucket.isErr()) {
            throw new Error(bucket.error.message);
        }
        const thread = await threadStore.create({
            profileId,
            conversationId: bucket.value.id,
            title: 'Main',
            topLevelTab: 'chat',
        });
        if (thread.isErr()) {
            throw new Error(thread.error.message);
        }
        const session = await sessionStore.create(profileId, thread.value.id, 'local');
        if (!session.created) {
            throw new Error(`Expected session creation to succeed, received "${session.reason}".`);
        }
        expect(session.session.turnCount).toBe(0);

        const run = await runStore.create({
            profileId,
            sessionId: session.session.id,
            prompt: 'hello',
            providerId: 'openai',
            modelId: 'openai/gpt-5',
            authMethod: 'api_key',
            runtimeOptions: {
                reasoning: {
                    effort: 'none',
                    summary: 'none',
                    includeEncrypted: false,
                },
                cache: {
                    strategy: 'auto',
                },
                transport: {
                    openai: 'auto',
                },
            },
            cache: {
                applied: false,
                key: 'store-test',
                reason: 'unsupported_transport',
            },
            transport: {
                selected: 'responses',
            },
        });
        await sessionStore.markRunPending(profileId, session.session.id, run.id);
        await runStore.finalize(run.id, { status: 'completed' });
        await sessionStore.markRunTerminal(profileId, session.session.id, 'completed');

        const status = await sessionStore.status(profileId, session.session.id);
        expect(status.found).toBe(true);
        if (!status.found) {
            throw new Error('Expected session to exist.');
        }
        expect(status.session.runStatus).toBe('completed');

        const reverted = await sessionHistoryService.revert(profileId, session.session.id);
        expect(reverted.reverted).toBe(true);
    });


    it('returns typed errors for invalid tag writes and missing session refreshes', async () => {
        const profileId = getDefaultProfileId();

        const invalidTag = await tagStore.upsert(profileId, '   ');
        expect(invalidTag.isErr()).toBe(true);
        if (invalidTag.isOk()) {
            throw new Error('Expected empty tag label to fail.');
        }
        expect(invalidTag.error.code).toBe('invalid_input');

        const missingRefresh = await sessionStore.refreshStatus(profileId, 'sess_missing' as `sess_${string}`);
        expect(missingRefresh.isErr()).toBe(true);
        if (missingRefresh.isOk()) {
            throw new Error('Expected missing session refresh to fail.');
        }
        expect(missingRefresh.error.code).toBe('not_found');
    });


    it('supports conversations, threads, tags, diffs, and checkpoints', async () => {
        const profileId = getDefaultProfileId();
        const conversation = await conversationStore.createOrGetBucket({
            profileId,
            scope: 'workspace',
            workspaceFingerprint: 'wsf_workspace_a',
            title: 'Workspace Chat',
        });
        if (conversation.isErr()) {
            throw new Error(conversation.error.message);
        }
        const thread = await threadStore.create({
            profileId,
            conversationId: conversation.value.id,
            title: 'Thread A',
            topLevelTab: 'chat',
        });
        if (thread.isErr()) {
            throw new Error(thread.error.message);
        }
        const tagResult = await tagStore.upsert(profileId, 'backend');
        expect(tagResult.isOk()).toBe(true);
        if (tagResult.isErr()) {
            throw new Error(tagResult.error.message);
        }
        const tag = tagResult.value;
        const linkedResult = await tagStore.setThreadTags(profileId, thread.value.id, [tag.id]);
        expect(linkedResult.isOk()).toBe(true);
        if (linkedResult.isErr()) {
            throw new Error(linkedResult.error.message);
        }
        const linked = linkedResult.value;

        const session = await sessionStore.create(profileId, thread.value.id, 'local');
        if (!session.created) {
            throw new Error(`Expected session creation to succeed, received "${session.reason}".`);
        }
        const run = await runStore.create({
            profileId,
            sessionId: session.session.id,
            prompt: 'first',
            providerId: 'openai',
            modelId: 'openai/gpt-5',
            authMethod: 'api_key',
            runtimeOptions: {
                reasoning: {
                    effort: 'none',
                    summary: 'none',
                    includeEncrypted: false,
                },
                cache: {
                    strategy: 'auto',
                },
                transport: {
                    openai: 'auto',
                },
            },
            cache: {
                applied: false,
                key: 'store-test',
                reason: 'unsupported_transport',
            },
            transport: {
                selected: 'responses',
            },
        });
        await sessionStore.markRunPending(profileId, session.session.id, run.id);
        await runStore.finalize(run.id, { status: 'completed' });
        await sessionStore.markRunTerminal(profileId, session.session.id, 'completed');

        const diff = await diffStore.create({
            profileId,
            sessionId: session.session.id,
            runId: run.id,
            summary: 'created patch',
            artifact: {
                kind: 'git',
                workspaceRootPath: 'M:\\workspace',
                workspaceLabel: 'workspace',
                baseRef: 'HEAD',
                fileCount: 1,
                files: [{ path: 'README.md', status: 'modified' }],
                fullPatch: 'diff --git a/README.md b/README.md\n',
                patchesByPath: {
                    'README.md': 'diff --git a/README.md b/README.md\n',
                },
            },
        });
        const checkpoint = await checkpointStore.create({
            profileId,
            sessionId: session.session.id,
            runId: run.id,
            diffId: diff.id,
            workspaceFingerprint: 'wsf_workspace_a',
            topLevelTab: 'agent',
            modeKey: 'code',
            summary: 'created checkpoint',
        });

        const conversations = await conversationStore.listBuckets(profileId);
        const threads = await threadStore.list({
            profileId,
            activeTab: 'chat',
            showAllModes: true,
            groupView: 'workspace',
            scope: 'workspace',
            workspaceFingerprint: 'wsf_workspace_a',
            sort: 'latest',
        });
        const tags = await tagStore.listByProfile(profileId);
        const threadTags = await tagStore.listThreadTagsByProfile(profileId);
        const diffs = await diffStore.listBySession(profileId, session.session.id);
        const checkpoints = await checkpointStore.listBySession(profileId, session.session.id);
        const firstLinked = linked[0];
        if (!firstLinked) {
            throw new Error('Expected at least one linked thread tag.');
        }

        expect(conversations.some((item) => item.id === conversation.value.id)).toBe(true);
        expect(threads.some((item) => item.id === thread.value.id)).toBe(true);
        expect(tags.some((item) => item.id === tag.id)).toBe(true);
        expect(
            threadTags.some((item) => item.threadId === firstLinked.threadId && item.tagId === firstLinked.tagId)
        ).toBe(true);
        expect(diffs.some((item) => item.id === diff.id)).toBe(true);
        expect(checkpoints.some((item) => item.id === checkpoint.id)).toBe(true);
    });
});
