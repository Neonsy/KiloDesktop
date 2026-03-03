import { getPersistence } from '@/app/backend/persistence/db';
import type { RulesetDefinitionRecord } from '@/app/backend/persistence/types';

function mapRulesetDefinition(row: {
    id: string;
    profile_id: string;
    workspace_fingerprint: string | null;
    name: string;
    body_markdown: string;
    source: string;
    enabled: 0 | 1;
    precedence: number;
    created_at: string;
    updated_at: string;
}): RulesetDefinitionRecord {
    return {
        id: row.id,
        profileId: row.profile_id,
        ...(row.workspace_fingerprint ? { workspaceFingerprint: row.workspace_fingerprint } : {}),
        name: row.name,
        bodyMarkdown: row.body_markdown,
        source: row.source,
        enabled: row.enabled === 1,
        precedence: row.precedence,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export class RulesetStore {
    async listByProfile(profileId: string): Promise<RulesetDefinitionRecord[]> {
        const { db } = getPersistence();
        const rows = await db
            .selectFrom('rulesets')
            .select([
                'id',
                'profile_id',
                'workspace_fingerprint',
                'name',
                'body_markdown',
                'source',
                'enabled',
                'precedence',
                'created_at',
                'updated_at',
            ])
            .where('profile_id', '=', profileId)
            .orderBy('precedence', 'desc')
            .orderBy('updated_at', 'desc')
            .execute();

        return rows.map(mapRulesetDefinition);
    }
}

export const rulesetStore = new RulesetStore();
