import type { ProfileStoreDb } from '@/app/backend/persistence/stores/profileStoreHelpers/types';

export async function resolveTemplateProfileId(tx: ProfileStoreDb, preferredProfileId?: string): Promise<string> {
    if (preferredProfileId) {
        const preferred = await tx
            .selectFrom('profiles')
            .select('id')
            .where('id', '=', preferredProfileId)
            .executeTakeFirst();
        if (preferred) {
            return preferred.id;
        }
    }

    const defaultProfile = await tx
        .selectFrom('profiles')
        .select('id')
        .where('id', '=', 'profile_local_default')
        .executeTakeFirst();

    if (defaultProfile) {
        return defaultProfile.id;
    }

    const oldest = await tx
        .selectFrom('profiles')
        .select('id')
        .orderBy('created_at', 'asc')
        .orderBy('id', 'asc')
        .executeTakeFirst();

    if (!oldest) {
        throw new Error('Cannot resolve template profile because no profiles exist.');
    }

    return oldest.id;
}
