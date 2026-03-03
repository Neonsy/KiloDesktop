import { getPersistence } from '@/app/backend/persistence/db';
import type { SecretReferenceRecord } from '@/app/backend/persistence/types';

function mapSecretReference(row: {
    id: string;
    profile_id: string;
    provider_id: string;
    secret_key_ref: string;
    secret_kind: string;
    status: string;
    updated_at: string;
}): SecretReferenceRecord {
    return {
        id: row.id,
        profileId: row.profile_id,
        providerId: row.provider_id,
        secretKeyRef: row.secret_key_ref,
        secretKind: row.secret_kind,
        status: row.status,
        updatedAt: row.updated_at,
    };
}

export class SecretReferenceStore {
    async listByProfile(profileId: string): Promise<SecretReferenceRecord[]> {
        const { db } = getPersistence();
        const rows = await db
            .selectFrom('secret_references')
            .select(['id', 'profile_id', 'provider_id', 'secret_key_ref', 'secret_kind', 'status', 'updated_at'])
            .where('profile_id', '=', profileId)
            .orderBy('provider_id', 'asc')
            .orderBy('secret_kind', 'asc')
            .execute();

        return rows.map(mapSecretReference);
    }

    async listAll(): Promise<SecretReferenceRecord[]> {
        const { db } = getPersistence();
        const rows = await db
            .selectFrom('secret_references')
            .select(['id', 'profile_id', 'provider_id', 'secret_key_ref', 'secret_kind', 'status', 'updated_at'])
            .orderBy('profile_id', 'asc')
            .orderBy('provider_id', 'asc')
            .orderBy('secret_kind', 'asc')
            .execute();

        return rows.map(mapSecretReference);
    }
}

export const secretReferenceStore = new SecretReferenceStore();
