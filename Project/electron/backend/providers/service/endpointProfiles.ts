import { settingsStore } from '@/app/backend/persistence/stores';
import {
    getDefaultEndpointProfile,
    getProviderDefinition,
    isValidEndpointProfile,
    resolveProviderApiKeyCta,
    type FirstPartyProviderId,
} from '@/app/backend/providers/registry';
import {
    errProviderService,
    okProviderService,
    type ProviderServiceResult,
} from '@/app/backend/providers/service/errors';

function endpointProfileSettingKey(providerId: FirstPartyProviderId): string {
    return `provider_endpoint_profile:${providerId}`;
}

export interface ProviderEndpointProfileState {
    providerId: FirstPartyProviderId;
    value: string;
    label: string;
    options: Array<{ value: string; label: string }>;
}

export async function getEndpointProfileState(
    profileId: string,
    providerId: FirstPartyProviderId
): Promise<ProviderServiceResult<ProviderEndpointProfileState>> {
    const definition = getProviderDefinition(providerId);
    const stored = await settingsStore.getStringOptional(profileId, endpointProfileSettingKey(providerId));
    const fallback = getDefaultEndpointProfile(providerId);
    const value = stored && isValidEndpointProfile(providerId, stored) ? stored : fallback;
    const selected = definition.endpointProfiles.find((profile) => profile.value === value);

    return okProviderService({
        providerId,
        value,
        label: selected?.label ?? value,
        options: definition.endpointProfiles.map((profile) => ({
            value: profile.value,
            label: profile.label,
        })),
    });
}

export async function setEndpointProfileState(
    profileId: string,
    providerId: FirstPartyProviderId,
    value: string
): Promise<ProviderServiceResult<ProviderEndpointProfileState>> {
    if (!isValidEndpointProfile(providerId, value)) {
        return errProviderService(
            'invalid_payload',
            `Invalid endpoint profile "${value}" for provider "${providerId}".`
        );
    }

    await settingsStore.setString(profileId, endpointProfileSettingKey(providerId), value);
    return getEndpointProfileState(profileId, providerId);
}

export async function resolveEndpointProfile(
    profileId: string,
    providerId: FirstPartyProviderId
): Promise<ProviderServiceResult<string>> {
    const state = await getEndpointProfileState(profileId, providerId);
    if (state.isErr()) {
        return errProviderService(state.error.code, state.error.message);
    }
    return okProviderService(state.value.value);
}

export async function resolveApiKeyCta(profileId: string, providerId: FirstPartyProviderId) {
    const endpointProfileResult = await resolveEndpointProfile(profileId, providerId);
    if (endpointProfileResult.isErr()) {
        return errProviderService(endpointProfileResult.error.code, endpointProfileResult.error.message);
    }

    return okProviderService(resolveProviderApiKeyCta(providerId, endpointProfileResult.value));
}
