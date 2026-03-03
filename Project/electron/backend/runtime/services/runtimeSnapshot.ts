import {
    accountSnapshotStore,
    conversationStore,
    diffStore,
    marketplaceStore,
    mcpStore,
    modeStore,
    permissionStore,
    providerStore,
    rulesetStore,
    runtimeEventStore,
    secretReferenceStore,
    sessionStore,
    skillfileStore,
    tagStore,
    toolStore,
} from '@/app/backend/persistence/stores';
import type { RuntimeSnapshotV1 } from '@/app/backend/persistence/types';

export interface RuntimeSnapshotService {
    getSnapshot(profileId: string): Promise<RuntimeSnapshotV1>;
}

class RuntimeSnapshotServiceImpl implements RuntimeSnapshotService {
    async getSnapshot(profileId: string): Promise<RuntimeSnapshotV1> {
        const [
            sessions,
            permissions,
            providers,
            providerModels,
            tools,
            mcpServers,
            defaults,
            lastSequence,
            conversations,
            threads,
            tags,
            threadTags,
            diffs,
            modeDefinitions,
            rulesets,
            skillfiles,
            marketplacePackages,
            kiloAccountContext,
            secretReferences,
        ] = await Promise.all([
            sessionStore.list(),
            permissionStore.listAll(),
            providerStore.listProviders(),
            providerStore.listModels(),
            toolStore.list(),
            mcpStore.listServers(),
            providerStore.getDefaults(profileId),
            runtimeEventStore.getLastSequence(),
            conversationStore.listConversations(),
            conversationStore.listThreads(),
            tagStore.list(),
            tagStore.listThreadTags(),
            diffStore.list(),
            modeStore.listByProfile(profileId),
            rulesetStore.listByProfile(profileId),
            skillfileStore.listByProfile(profileId),
            marketplaceStore.listPackages(),
            accountSnapshotStore.getByProfile(profileId),
            secretReferenceStore.listByProfile(profileId),
        ]);

        return {
            generatedAt: new Date().toISOString(),
            lastSequence,
            sessions,
            permissions,
            providers: providers.map((provider) => ({
                ...provider,
                isDefault: provider.id === defaults.providerId,
            })),
            providerModels,
            tools,
            mcpServers,
            conversations,
            threads,
            tags,
            threadTags,
            diffs,
            modeDefinitions,
            rulesets,
            skillfiles,
            marketplacePackages,
            kiloAccountContext,
            secretReferences,
            defaults,
        };
    }
}

export const runtimeSnapshotService: RuntimeSnapshotService = new RuntimeSnapshotServiceImpl();
