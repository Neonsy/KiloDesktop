interface RefetchableQuery {
    refetch: () => Promise<unknown>;
}

export interface ConversationRefetchQueries {
    listBucketsQuery: RefetchableQuery;
    listThreadsQuery: RefetchableQuery;
    listTagsQuery: RefetchableQuery;
    shellBootstrapQuery: RefetchableQuery;
    sessionsQuery: RefetchableQuery;
    runsQuery: RefetchableQuery;
    messagesQuery: RefetchableQuery;
    activePlanQuery: RefetchableQuery;
    orchestratorLatestQuery: RefetchableQuery;
    pendingPermissionsQuery: RefetchableQuery;
}

interface UseConversationRefetchInput {
    queries: ConversationRefetchQueries;
}

function refetchQueries(queries: RefetchableQuery[]) {
    return Promise.all(queries.map((query) => query.refetch()));
}

export function useConversationRefetch(input: UseConversationRefetchInput) {
    return {
        refetchThreadChrome: () =>
            refetchQueries([
                input.queries.listBucketsQuery,
                input.queries.listThreadsQuery,
                input.queries.listTagsQuery,
                input.queries.shellBootstrapQuery,
            ]),
        refetchSessionIndex: () =>
            refetchQueries([input.queries.sessionsQuery, input.queries.listThreadsQuery]),
        refetchSessionWorkspace: () =>
            refetchQueries([
                input.queries.sessionsQuery,
                input.queries.runsQuery,
                input.queries.messagesQuery,
                input.queries.listThreadsQuery,
            ]),
        refetchExecutionEnvironment: () =>
            refetchQueries([
                input.queries.listThreadsQuery,
                input.queries.shellBootstrapQuery,
                input.queries.sessionsQuery,
            ]),
        refetchPlanWorkspace: () =>
            refetchQueries([input.queries.activePlanQuery, input.queries.orchestratorLatestQuery, input.queries.runsQuery]),
        refetchPendingPermissions: () => refetchQueries([input.queries.pendingPermissionsQuery]),
    };
}
