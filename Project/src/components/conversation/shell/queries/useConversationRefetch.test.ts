import { describe, expect, it, vi } from 'vitest';

import {
    type ConversationRefetchQueries,
    useConversationRefetch,
} from '@/web/components/conversation/shell/queries/useConversationRefetch';

function createRefetchQueries(callLog: string[]): ConversationRefetchQueries {
    const createQuery = (queryName: string) => ({
        refetch: vi.fn(() => {
            callLog.push(queryName);
            return Promise.resolve();
        }),
    });

    return {
        listBucketsQuery: createQuery('listBucketsQuery'),
        listThreadsQuery: createQuery('listThreadsQuery'),
        listTagsQuery: createQuery('listTagsQuery'),
        shellBootstrapQuery: createQuery('shellBootstrapQuery'),
        sessionsQuery: createQuery('sessionsQuery'),
        runsQuery: createQuery('runsQuery'),
        messagesQuery: createQuery('messagesQuery'),
        activePlanQuery: createQuery('activePlanQuery'),
        orchestratorLatestQuery: createQuery('orchestratorLatestQuery'),
        pendingPermissionsQuery: createQuery('pendingPermissionsQuery'),
    };
}

describe('useConversationRefetch', () => {
    it('refetches each shell query group exactly once', async () => {
        const callLog: string[] = [];
        const queries = createRefetchQueries(callLog);
        const refetch = useConversationRefetch({ queries });

        await refetch.refetchThreadChrome();
        expect(callLog).toEqual([
            'listBucketsQuery',
            'listThreadsQuery',
            'listTagsQuery',
            'shellBootstrapQuery',
        ]);

        callLog.length = 0;
        await refetch.refetchSessionIndex();
        expect(callLog).toEqual(['sessionsQuery', 'listThreadsQuery']);

        callLog.length = 0;
        await refetch.refetchSessionWorkspace();
        expect(callLog).toEqual(['sessionsQuery', 'runsQuery', 'messagesQuery', 'listThreadsQuery']);

        callLog.length = 0;
        await refetch.refetchPlanWorkspace();
        expect(callLog).toEqual(['activePlanQuery', 'orchestratorLatestQuery', 'runsQuery']);

        callLog.length = 0;
        await refetch.refetchExecutionEnvironment();
        expect(callLog).toEqual(['listThreadsQuery', 'shellBootstrapQuery', 'sessionsQuery']);

        callLog.length = 0;
        await refetch.refetchPendingPermissions();
        expect(callLog).toEqual(['pendingPermissionsQuery']);

        expect(queries.listBucketsQuery.refetch).toHaveBeenCalledTimes(1);
        expect(queries.listThreadsQuery.refetch).toHaveBeenCalledTimes(4);
        expect(queries.listTagsQuery.refetch).toHaveBeenCalledTimes(1);
        expect(queries.shellBootstrapQuery.refetch).toHaveBeenCalledTimes(2);
        expect(queries.sessionsQuery.refetch).toHaveBeenCalledTimes(3);
        expect(queries.runsQuery.refetch).toHaveBeenCalledTimes(2);
        expect(queries.messagesQuery.refetch).toHaveBeenCalledTimes(1);
        expect(queries.activePlanQuery.refetch).toHaveBeenCalledTimes(1);
        expect(queries.orchestratorLatestQuery.refetch).toHaveBeenCalledTimes(1);
        expect(queries.pendingPermissionsQuery.refetch).toHaveBeenCalledTimes(1);
    });
});
