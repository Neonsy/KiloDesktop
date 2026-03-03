import { getPersistence } from '@/app/backend/persistence/db';
import { parseJsonValue } from '@/app/backend/persistence/stores/utils';
import type { KiloAccountContextRecord } from '@/app/backend/persistence/types';

const EMPTY_SNAPSHOT_UPDATED_AT = '1970-01-01T00:00:00.000Z';

export class AccountSnapshotStore {
    async getByProfile(profileId: string): Promise<KiloAccountContextRecord> {
        const { db } = getPersistence();
        const [accountRow, organizationRows] = await Promise.all([
            db
                .selectFrom('kilo_account_snapshots')
                .select([
                    'profile_id',
                    'account_id',
                    'display_name',
                    'email_masked',
                    'auth_state',
                    'token_expires_at',
                    'updated_at',
                ])
                .where('profile_id', '=', profileId)
                .executeTakeFirst(),
            db
                .selectFrom('kilo_org_snapshots')
                .select(['id', 'profile_id', 'organization_id', 'name', 'is_active', 'entitlement_json', 'updated_at'])
                .where('profile_id', '=', profileId)
                .orderBy('is_active', 'desc')
                .orderBy('name', 'asc')
                .execute(),
        ]);

        if (!accountRow) {
            return {
                profileId,
                displayName: '',
                emailMasked: '',
                authState: 'logged_out',
                organizations: organizationRows.map((organizationRow) => ({
                    id: organizationRow.id,
                    organizationId: organizationRow.organization_id,
                    name: organizationRow.name,
                    isActive: organizationRow.is_active === 1,
                    entitlement: parseJsonValue(organizationRow.entitlement_json, {}),
                })),
                updatedAt: EMPTY_SNAPSHOT_UPDATED_AT,
            };
        }

        return {
            profileId: accountRow.profile_id,
            ...(accountRow.account_id ? { accountId: accountRow.account_id } : {}),
            displayName: accountRow.display_name,
            emailMasked: accountRow.email_masked,
            authState: accountRow.auth_state,
            ...(accountRow.token_expires_at ? { tokenExpiresAt: accountRow.token_expires_at } : {}),
            organizations: organizationRows.map((organizationRow) => ({
                id: organizationRow.id,
                organizationId: organizationRow.organization_id,
                name: organizationRow.name,
                isActive: organizationRow.is_active === 1,
                entitlement: parseJsonValue(organizationRow.entitlement_json, {}),
            })),
            updatedAt: accountRow.updated_at,
        };
    }
}

export const accountSnapshotStore = new AccountSnapshotStore();
