import { trpc } from '@/web/trpc/client';

import type { RuntimeEventRecordV1 } from '@/app/backend/persistence/types';

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

async function invalidateConversationQueries(utils: TrpcUtils): Promise<void> {
    await Promise.all([
        utils.conversation.listBuckets.invalidate(),
        utils.conversation.listTags.invalidate(),
        utils.conversation.listThreads.invalidate(),
        utils.runtime.getShellBootstrap.invalidate(),
    ]);
}

async function invalidateSessionQueries(utils: TrpcUtils): Promise<void> {
    await Promise.all([
        utils.session.list.invalidate(),
        utils.session.status.invalidate(),
        utils.session.listRuns.invalidate(),
        utils.session.listMessages.invalidate(),
        utils.conversation.listThreads.invalidate(),
    ]);
}

async function invalidateProviderQueries(utils: TrpcUtils): Promise<void> {
    await Promise.all([
        utils.provider.listProviders.invalidate(),
        utils.provider.getDefaults.invalidate(),
        utils.provider.listModels.invalidate(),
        utils.provider.getAuthState.invalidate(),
        utils.provider.getAccountContext.invalidate(),
        utils.provider.getModelRoutingPreference.invalidate(),
        utils.provider.listModelProviders.invalidate(),
        utils.provider.getOpenAISubscriptionUsage.invalidate(),
        utils.provider.getOpenAISubscriptionRateLimits.invalidate(),
        utils.runtime.getShellBootstrap.invalidate(),
    ]);
}

async function invalidateRunPartQueries(utils: TrpcUtils): Promise<void> {
    await utils.session.listMessages.invalidate();
}

export async function invalidateQueriesForRuntimeEvent(
    utils: TrpcUtils,
    event: RuntimeEventRecordV1
): Promise<void> {
    if (event.entityType === 'conversation' || event.entityType === 'thread' || event.entityType === 'tag') {
        await invalidateConversationQueries(utils);
        return;
    }

    if (event.entityType === 'session') {
        await invalidateSessionQueries(utils);
        return;
    }

    if (event.entityType === 'run') {
        if (event.eventType === 'run.part.appended' || event.eventType === 'run.reasoning.appended') {
            await invalidateRunPartQueries(utils);
            return;
        }

        await invalidateSessionQueries(utils);
        return;
    }

    if (event.entityType === 'provider') {
        await invalidateProviderQueries(utils);
        return;
    }

    if (event.entityType === 'plan') {
        await utils.plan.getActive.invalidate();
        return;
    }

    if (event.entityType === 'orchestrator') {
        await utils.orchestrator.latestBySession.invalidate();
        return;
    }

    if (event.entityType === 'profile') {
        await Promise.all([utils.profile.list.invalidate(), utils.runtime.getShellBootstrap.invalidate()]);
        return;
    }

    if (event.entityType === 'runtime') {
        await Promise.all([utils.runtime.getShellBootstrap.invalidate(), utils.runtime.getSnapshot.invalidate()]);
    }
}
