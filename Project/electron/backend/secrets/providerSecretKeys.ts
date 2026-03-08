import type { RuntimeProviderId } from '@/app/backend/runtime/contracts';

export const providerSecretKinds = ['api_key', 'access_token', 'refresh_token'] as const;

export type ProviderSecretKeyKind = (typeof providerSecretKinds)[number];

export interface ParsedProviderSecretKey {
    profileId: string;
    providerId: RuntimeProviderId;
    secretKind: ProviderSecretKeyKind;
}

export function buildProviderSecretKey(
    profileId: string,
    providerId: RuntimeProviderId,
    secretKind: ProviderSecretKeyKind
): string {
    return `provider/${profileId}/${providerId}/${secretKind}`;
}

export function tryParseProviderSecretKey(secretKey: string): ParsedProviderSecretKey | null {
    const parts = secretKey.split('/');
    if (parts.length !== 4 || parts[0] !== 'provider') {
        return null;
    }

    const [, profileId, providerId, secretKindValue] = parts;
    const secretKind = providerSecretKinds.find((candidate) => candidate === secretKindValue);
    if (!profileId || !providerId || !secretKind) {
        return null;
    }

    return {
        profileId,
        providerId: providerId as RuntimeProviderId,
        secretKind,
    };
}
