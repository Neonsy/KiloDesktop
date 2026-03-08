import { randomUUID } from 'node:crypto';

import { nowIso } from '@/app/backend/persistence/stores/shared/utils';
import type { ProfileRecord } from '@/app/backend/persistence/types';

export const DEFAULT_PROFILE_NAME = 'New Profile';
export const DEFAULT_DUPLICATE_SUFFIX = 'Copy';

export function mapProfile(row: {
    id: string;
    name: string;
    is_active: 0 | 1;
    created_at: string;
    updated_at: string;
}): ProfileRecord {
    return {
        id: row.id,
        name: row.name,
        isActive: row.is_active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function normalizeName(name: string | undefined, fallback: string): string {
    const trimmed = name?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function createProfileId(): string {
    return `profile_${randomUUID()}`;
}

export function createTimestamp(): string {
    return nowIso();
}
