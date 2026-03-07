import { getPersistence } from '@/app/backend/persistence/db';
import { parseEnumValue } from '@/app/backend/persistence/stores/rowParsers';
import { isJsonString, isJsonUnknownArray, parseJsonValue } from '@/app/backend/persistence/stores/utils';
import type { SkillfileDefinitionRecord } from '@/app/backend/persistence/types';
import { registryScopes, registrySourceKinds } from '@/app/backend/runtime/contracts';

function parseTags(value: string): string[] | undefined {
    const parsed = parseJsonValue(value, [], isJsonUnknownArray).filter(isJsonString);
    return parsed.length > 0 ? parsed : undefined;
}

function mapSkillfileDefinition(row: {
    id: string;
    profile_id: string;
    asset_key: string;
    scope: string;
    workspace_fingerprint: string | null;
    name: string;
    body_markdown: string;
    source: string;
    source_kind: string;
    origin_path: string | null;
    description: string | null;
    tags_json: string;
    enabled: 0 | 1;
    precedence: number;
    created_at: string;
    updated_at: string;
}): SkillfileDefinitionRecord {
    const tags = parseTags(row.tags_json);
    return {
        id: row.id,
        profileId: row.profile_id,
        assetKey: row.asset_key,
        scope: parseEnumValue(row.scope, 'skillfiles.scope', registryScopes),
        ...(row.workspace_fingerprint ? { workspaceFingerprint: row.workspace_fingerprint } : {}),
        name: row.name,
        bodyMarkdown: row.body_markdown,
        source: row.source,
        sourceKind: parseEnumValue(row.source_kind, 'skillfiles.source_kind', registrySourceKinds),
        ...(row.origin_path ? { originPath: row.origin_path } : {}),
        ...(row.description ? { description: row.description } : {}),
        ...(tags ? { tags } : {}),
        enabled: row.enabled === 1,
        precedence: row.precedence,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export class SkillfileStore {
    async listByProfile(profileId: string): Promise<SkillfileDefinitionRecord[]> {
        const { db } = getPersistence();
        const rows = await db
            .selectFrom('skillfiles')
            .select([
                'id',
                'profile_id',
                'asset_key',
                'scope',
                'workspace_fingerprint',
                'name',
                'body_markdown',
                'source',
                'source_kind',
                'origin_path',
                'description',
                'tags_json',
                'enabled',
                'precedence',
                'created_at',
                'updated_at',
            ])
            .where('profile_id', '=', profileId)
            .orderBy('precedence', 'desc')
            .orderBy('updated_at', 'desc')
            .execute();

        return rows.map(mapSkillfileDefinition);
    }
}

export const skillfileStore = new SkillfileStore();
