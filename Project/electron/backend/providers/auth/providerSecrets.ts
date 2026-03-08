import type { ProviderSecretKind } from '@/app/backend/runtime/contracts';
import type { RuntimeProviderId } from '@/app/backend/runtime/contracts';
import { buildProviderSecretKey } from '@/app/backend/secrets/providerSecretKeys';
import { getSecretStore } from '@/app/backend/secrets/store';

export async function writeProviderSecretValue(input: {
    profileId: string;
    providerId: RuntimeProviderId;
    secretKind: ProviderSecretKind;
    value: string;
}): Promise<void> {
    const providerSecretKey = buildProviderSecretKey(input.profileId, input.providerId, input.secretKind);
    await getSecretStore().set(providerSecretKey, input.value);
}

export async function readProviderSecretValue(
    profileId: string,
    providerId: RuntimeProviderId,
    secretKind: ProviderSecretKind
): Promise<string | undefined> {
    const value = await getSecretStore().get(buildProviderSecretKey(profileId, providerId, secretKind));
    return value ?? undefined;
}
