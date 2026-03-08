import { describe, expect, it } from 'vitest';

import {
    registerPersistenceStoreHooks,
    accountSnapshotStore,
    getDefaultProfileId,
    marketplaceStore,
    mcpStore,
    modeStore,
    permissionStore,
    providerSecretStore,
    skillfileStore,
    toolStore,
} from '@/app/backend/persistence/__tests__/stores.shared';

registerPersistenceStoreHooks();

describe('persistence stores: runtime domain', () => {
    it('supports permission store decision transitions', async () => {
        const profileId = getDefaultProfileId();
        const created = await permissionStore.create({
            profileId,
            policy: 'ask',
            resource: 'tool:run_command',
            toolId: 'run_command',
            scopeKind: 'tool',
            summary: {
                title: 'Run Command Request',
                detail: 'Need shell command access.',
            },
            commandText: 'node --version',
            approvalCandidates: [
                {
                    label: 'node --version',
                    resource: 'tool:run_command:prefix:node --version',
                },
                {
                    label: 'node',
                    resource: 'tool:run_command:prefix:node',
                },
            ],
        });
        expect(created.decision).toBe('pending');
        expect(created.commandText).toBe('node --version');
        expect(created.approvalCandidates?.map((candidate) => candidate.label)).toEqual(['node --version', 'node']);

        const granted = await permissionStore.resolve(created.id, 'allow_once');
        expect(granted?.decision).toBe('granted');
        expect(granted?.resolvedScope).toBe('once');

        const denied = await permissionStore.resolve(created.id, 'deny');
        expect(denied?.decision).toBe('denied');
    });


    it('supports mcp and tool seed stores', async () => {
        const tools = await toolStore.list();
        expect(tools.some((tool) => tool.id === 'read_file')).toBe(true);

        const servers = await mcpStore.listServers();
        expect(servers.some((server) => server.id === 'github')).toBe(true);

        const connected = await mcpStore.connect('github');
        expect(connected?.connectionState).toBe('connected');
    });


    it('seeds parity baseline stores', async () => {
        const profileId = getDefaultProfileId();

        const [modes, skillfiles, account, marketplacePackages, providerSecrets] = await Promise.all([
            modeStore.listByProfile(profileId),
            skillfileStore.listByProfile(profileId),
            accountSnapshotStore.getByProfile(profileId),
            marketplaceStore.listPackages(),
            providerSecretStore.listByProfile(profileId),
        ]);

        expect(modes.some((mode) => mode.topLevelTab === 'chat' && mode.modeKey === 'chat')).toBe(true);
        expect(modes.some((mode) => mode.topLevelTab === 'agent' && mode.modeKey === 'ask')).toBe(true);
        expect(skillfiles).toEqual([]);
        expect(account.authState).toBe('logged_out');
        expect(account.profileId).toBe(profileId);
        expect(marketplacePackages).toEqual([]);
        expect(providerSecrets).toEqual([]);
    });

});
