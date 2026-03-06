import { runtimeEventStore, tagStore } from '@/app/backend/persistence/stores';
import { providerManagementService } from '@/app/backend/providers/service';
import type { RuntimeShellBootstrap } from '@/app/backend/runtime/contracts';

export interface RuntimeShellBootstrapService {
    getShellBootstrap(profileId: string): Promise<RuntimeShellBootstrap>;
}

class RuntimeShellBootstrapServiceImpl implements RuntimeShellBootstrapService {
    async getShellBootstrap(profileId: string): Promise<RuntimeShellBootstrap> {
        const [lastSequence, providers, providerModels, defaults, threadTags] = await Promise.all([
            runtimeEventStore.getLastSequence(),
            providerManagementService.listProviders(profileId),
            providerManagementService.listModelsByProfile(profileId),
            providerManagementService.getDefaults(profileId),
            tagStore.listThreadTagsByProfile(profileId),
        ]);

        return {
            lastSequence,
            providers,
            providerModels,
            defaults,
            threadTags,
        };
    }
}

export const runtimeShellBootstrapService: RuntimeShellBootstrapService = new RuntimeShellBootstrapServiceImpl();
