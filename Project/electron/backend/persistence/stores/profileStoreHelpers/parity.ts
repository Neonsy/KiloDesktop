import { randomUUID } from 'node:crypto';

import type { ProfileStoreDb } from '@/app/backend/persistence/stores/profileStoreHelpers/types';

async function copyModeDefinitions(
    tx: ProfileStoreDb,
    sourceProfileId: string,
    targetProfileId: string,
    timestamp: string
): Promise<void> {
    const modes = await tx
        .selectFrom('mode_definitions')
        .select(['top_level_tab', 'mode_key', 'label', 'prompt_json', 'execution_policy_json', 'source', 'enabled'])
        .where('profile_id', '=', sourceProfileId)
        .orderBy('top_level_tab', 'asc')
        .orderBy('mode_key', 'asc')
        .execute();

    if (modes.length === 0) {
        return;
    }

    await tx
        .insertInto('mode_definitions')
        .values(
            modes.map((mode) => ({
                id: `mode_${targetProfileId}_${mode.top_level_tab}_${mode.mode_key}_${randomUUID()}`,
                profile_id: targetProfileId,
                top_level_tab: mode.top_level_tab,
                mode_key: mode.mode_key,
                label: mode.label,
                prompt_json: mode.prompt_json,
                execution_policy_json: mode.execution_policy_json,
                source: mode.source,
                enabled: mode.enabled,
                created_at: timestamp,
                updated_at: timestamp,
            }))
        )
        .execute();
}

async function copyRulesets(
    tx: ProfileStoreDb,
    sourceProfileId: string,
    targetProfileId: string,
    timestamp: string
): Promise<void> {
    const rows = await tx
        .selectFrom('rulesets')
        .select(['workspace_fingerprint', 'name', 'body_markdown', 'source', 'enabled', 'precedence'])
        .where('profile_id', '=', sourceProfileId)
        .execute();

    if (rows.length === 0) {
        return;
    }

    await tx
        .insertInto('rulesets')
        .values(
            rows.map((row) => ({
                id: `ruleset_${randomUUID()}`,
                profile_id: targetProfileId,
                workspace_fingerprint: row.workspace_fingerprint,
                name: row.name,
                body_markdown: row.body_markdown,
                source: row.source,
                enabled: row.enabled,
                precedence: row.precedence,
                created_at: timestamp,
                updated_at: timestamp,
            }))
        )
        .execute();
}

async function copySkillfiles(
    tx: ProfileStoreDb,
    sourceProfileId: string,
    targetProfileId: string,
    timestamp: string
): Promise<void> {
    const rows = await tx
        .selectFrom('skillfiles')
        .select(['workspace_fingerprint', 'name', 'body_markdown', 'source', 'enabled', 'precedence'])
        .where('profile_id', '=', sourceProfileId)
        .execute();

    if (rows.length === 0) {
        return;
    }

    await tx
        .insertInto('skillfiles')
        .values(
            rows.map((row) => ({
                id: `skillfile_${randomUUID()}`,
                profile_id: targetProfileId,
                workspace_fingerprint: row.workspace_fingerprint,
                name: row.name,
                body_markdown: row.body_markdown,
                source: row.source,
                enabled: row.enabled,
                precedence: row.precedence,
                created_at: timestamp,
                updated_at: timestamp,
            }))
        )
        .execute();
}

export async function copyProfileParityRows(input: {
    tx: ProfileStoreDb;
    sourceProfileId: string;
    targetProfileId: string;
    timestamp: string;
}): Promise<void> {
    await copyModeDefinitions(input.tx, input.sourceProfileId, input.targetProfileId, input.timestamp);
    await copyRulesets(input.tx, input.sourceProfileId, input.targetProfileId, input.timestamp);
    await copySkillfiles(input.tx, input.sourceProfileId, input.targetProfileId, input.timestamp);
}
