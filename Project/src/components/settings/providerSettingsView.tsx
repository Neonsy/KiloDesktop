import { useEffect, useState } from 'react';

import { ProviderAuthenticationSection } from '@/web/components/settings/providerSettings/authenticationSection';
import { ProviderDefaultModelSection } from '@/web/components/settings/providerSettings/defaultModelSection';
import { useKiloRoutingDraft } from '@/web/components/settings/providerSettings/hooks/useKiloRoutingDraft';
import { useProviderSettingsMutations } from '@/web/components/settings/providerSettings/hooks/useProviderSettingsMutations';
import { useProviderSettingsQueries } from '@/web/components/settings/providerSettings/hooks/useProviderSettingsQueries';
import { KiloRoutingSection } from '@/web/components/settings/providerSettings/kiloRoutingSection';
import {
    OpenAIAccountLimitsSection,
    OpenAILocalUsageSection,
} from '@/web/components/settings/providerSettings/openAISections';
import { ProviderSidebar } from '@/web/components/settings/providerSettings/providerSidebar';
import type {
    ActiveAuthFlow,
    ProviderAuthStateView,
    ProviderListItem,
} from '@/web/components/settings/providerSettings/types';

import type { RuntimeProviderId } from '@/app/backend/runtime/contracts';

interface ProviderSettingsViewProps {
    profileId: string;
}

export function ProviderSettingsView({ profileId }: ProviderSettingsViewProps) {
    const [selectedProviderId, setSelectedProviderId] = useState<RuntimeProviderId | undefined>(undefined);
    const [selectedModelId, setSelectedModelId] = useState<string>('');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [activeAuthFlow, setActiveAuthFlow] = useState<ActiveAuthFlow | undefined>(undefined);
    const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);

    const {
        providersQuery,
        defaultsQuery,
        listModelsQuery,
        authStateQuery,
        kiloRoutingPreferenceQuery,
        kiloModelProvidersQuery,
        accountContextQuery,
        openAISubscriptionUsageQuery,
        openAISubscriptionRateLimitsQuery,
    } = useProviderSettingsQueries({
        profileId,
        selectedProviderId,
        selectedModelId,
    });

    const providers = providersQuery.data?.providers ?? [];
    const defaults = defaultsQuery.data?.defaults;
    const providerItems: ProviderListItem[] = providers;
    const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);

    useEffect(() => {
        setActiveAuthFlow(undefined);
        setApiKeyInput('');
        setStatusMessage(undefined);
    }, [profileId]);

    useEffect(() => {
        if (selectedProviderId && providers.some((provider) => provider.id === selectedProviderId)) {
            return;
        }

        const fallbackProvider = providers.find((provider) => provider.isDefault)?.id ?? providers[0]?.id;
        if (fallbackProvider) {
            setSelectedProviderId(fallbackProvider);
        }
    }, [providers, selectedProviderId]);

    const mutations = useProviderSettingsMutations({
        profileId,
        selectedProviderId,
        setStatusMessage,
        setApiKeyInput,
        setActiveAuthFlow,
        refetchProviders: () => {
            void providersQuery.refetch();
        },
        refetchDefaults: () => {
            void defaultsQuery.refetch();
        },
        refetchAuthState: () => {
            void authStateQuery.refetch();
        },
        refetchListModels: () => {
            void listModelsQuery.refetch();
        },
        refetchKiloRoutingPreference: () => {
            void kiloRoutingPreferenceQuery.refetch();
        },
        refetchKiloModelProviders: () => {
            void kiloModelProvidersQuery.refetch();
        },
        refetchAccountContext: () => {
            void accountContextQuery.refetch();
        },
        refetchOpenAIRateLimits: () => {
            void openAISubscriptionRateLimitsQuery.refetch();
        },
    });

    useEffect(() => {
        if (!activeAuthFlow || mutations.pollAuthMutation.isPending) {
            return;
        }

        const timer = window.setTimeout(
            () => {
                void mutations.pollAuthMutation.mutateAsync({
                    profileId,
                    providerId: activeAuthFlow.providerId,
                    flowId: activeAuthFlow.flowId,
                });
            },
            Math.max(1, activeAuthFlow.pollAfterSeconds) * 1000
        );

        return () => {
            window.clearTimeout(timer);
        };
    }, [activeAuthFlow, mutations.pollAuthMutation, profileId]);

    const methods = selectedProvider?.availableAuthMethods ?? [];
    const models = listModelsQuery.data?.models ?? [];
    const kiloModelProviders = kiloModelProvidersQuery.data?.providers ?? [];

    useEffect(() => {
        if (!selectedProviderId) {
            return;
        }

        if (selectedModelId && models.some((model) => model.id === selectedModelId)) {
            return;
        }

        if (defaults?.providerId === selectedProviderId && models.some((model) => model.id === defaults.modelId)) {
            setSelectedModelId(defaults.modelId);
            return;
        }

        setSelectedModelId(models[0]?.id ?? '');
    }, [defaults?.modelId, defaults?.providerId, models, selectedModelId, selectedProviderId]);

    const selectedAuthState: ProviderAuthStateView | undefined = authStateQuery.data?.found
        ? authStateQuery.data.state
        : undefined;
    const selectedIsDefaultProvider = defaults?.providerId === selectedProviderId;
    const selectedIsDefaultModel = selectedIsDefaultProvider && defaults?.modelId === selectedModelId;
    const openAISubscriptionUsage = openAISubscriptionUsageQuery.data?.usage;
    const openAISubscriptionRateLimits = openAISubscriptionRateLimitsQuery.data?.rateLimits;

    const { kiloRoutingDraft, saveKiloRoutingPreference } = useKiloRoutingDraft({
        profileId,
        selectedProviderId,
        selectedModelId,
        preference: kiloRoutingPreferenceQuery.data?.preference,
        providerOptions: kiloModelProviders,
        setStatusMessage,
        savePreference: async (saveInput) => {
            await mutations.setModelRoutingPreferenceMutation.mutateAsync(saveInput);
        },
    });

    return (
        <section className='grid min-h-full grid-cols-[260px_1fr]'>
            <ProviderSidebar
                providers={providerItems}
                selectedProviderId={selectedProviderId}
                onSelectProvider={(providerId) => {
                    setStatusMessage(undefined);
                    setSelectedProviderId(providerId);
                }}
            />

            <div className='min-h-0 overflow-y-auto p-4'>
                {selectedProvider ? (
                    <div className='space-y-5'>
                        <div>
                            <h4 className='text-base font-semibold'>{selectedProvider.label}</h4>
                            <p className='text-muted-foreground text-xs'>
                                Local runtime works with any configured provider. Kilo login is only required for
                                Kilo-specific extras.
                            </p>
                            {statusMessage ? <p className='text-primary mt-2 text-xs'>{statusMessage}</p> : null}
                        </div>

                        <ProviderDefaultModelSection
                            selectedProviderId={selectedProviderId}
                            selectedModelId={selectedModelId}
                            models={models}
                            isDefaultModel={selectedIsDefaultModel}
                            isSavingDefault={mutations.setDefaultMutation.isPending}
                            isSyncingCatalog={mutations.syncCatalogMutation.isPending}
                            onSelectModel={setSelectedModelId}
                            onSetDefault={() => {
                                if (!selectedProviderId || !selectedModelId) {
                                    return;
                                }

                                void mutations.setDefaultMutation.mutateAsync({
                                    profileId,
                                    providerId: selectedProviderId,
                                    modelId: selectedModelId,
                                });
                            }}
                            onSyncCatalog={() => {
                                if (!selectedProviderId) {
                                    return;
                                }

                                void mutations.syncCatalogMutation.mutateAsync({
                                    profileId,
                                    providerId: selectedProviderId,
                                    force: true,
                                });
                            }}
                        />

                        {selectedProvider.features.supportsKiloRouting &&
                        selectedModelId.trim().length > 0 &&
                        kiloRoutingDraft ? (
                            <KiloRoutingSection
                                selectedModelId={selectedModelId}
                                draft={kiloRoutingDraft}
                                providers={kiloModelProviders}
                                isLoadingPreference={kiloRoutingPreferenceQuery.isLoading}
                                isLoadingProviders={kiloModelProvidersQuery.isLoading}
                                isSaving={mutations.setModelRoutingPreferenceMutation.isPending}
                                onModeChange={(mode) => {
                                    if (mode === 'dynamic') {
                                        void saveKiloRoutingPreference({
                                            routingMode: 'dynamic',
                                            sort: kiloRoutingDraft.sort,
                                            pinnedProviderId: '',
                                        });
                                        return;
                                    }

                                    const pinnedProviderId =
                                        kiloRoutingDraft.pinnedProviderId || kiloModelProviders[0]?.providerId || '';
                                    if (!pinnedProviderId) {
                                        setStatusMessage('No available providers to pin for this model.');
                                        return;
                                    }

                                    void saveKiloRoutingPreference({
                                        routingMode: 'pinned',
                                        sort: 'default',
                                        pinnedProviderId,
                                    });
                                }}
                                onSortChange={(sort) => {
                                    void saveKiloRoutingPreference({
                                        routingMode: 'dynamic',
                                        sort,
                                        pinnedProviderId: '',
                                    });
                                }}
                                onPinnedProviderChange={(providerId) => {
                                    if (providerId.trim().length === 0) {
                                        return;
                                    }

                                    void saveKiloRoutingPreference({
                                        routingMode: 'pinned',
                                        sort: 'default',
                                        pinnedProviderId: providerId,
                                    });
                                }}
                            />
                        ) : null}

                        <ProviderAuthenticationSection
                            selectedProviderId={selectedProviderId}
                            selectedProviderAuthState={selectedProvider.authState}
                            selectedProviderAuthMethod={selectedProvider.authMethod}
                            selectedAuthState={selectedAuthState}
                            methods={methods}
                            endpointProfileValue={selectedProvider.endpointProfile.value}
                            endpointProfileOptions={selectedProvider.endpointProfiles}
                            apiKeyCta={selectedProvider.apiKeyCta}
                            apiKeyInput={apiKeyInput}
                            activeAuthFlow={activeAuthFlow}
                            isSavingApiKey={mutations.setApiKeyMutation.isPending}
                            isSavingEndpointProfile={mutations.setEndpointProfileMutation.isPending}
                            isStartingAuth={mutations.startAuthMutation.isPending}
                            isPollingAuth={mutations.pollAuthMutation.isPending}
                            isCancellingAuth={mutations.cancelAuthMutation.isPending}
                            onApiKeyInputChange={setApiKeyInput}
                            onEndpointProfileChange={(value) => {
                                if (!selectedProviderId) {
                                    return;
                                }

                                void mutations.setEndpointProfileMutation.mutateAsync({
                                    profileId,
                                    providerId: selectedProviderId,
                                    value,
                                });
                            }}
                            onSaveApiKey={() => {
                                if (!selectedProviderId) {
                                    return;
                                }

                                void mutations.setApiKeyMutation.mutateAsync({
                                    profileId,
                                    providerId: selectedProviderId,
                                    apiKey: apiKeyInput.trim(),
                                });
                            }}
                            onStartOAuthDevice={() => {
                                if (!selectedProviderId) {
                                    return;
                                }

                                void mutations.startAuthMutation.mutateAsync({
                                    profileId,
                                    providerId: selectedProviderId,
                                    method: 'oauth_device',
                                });
                            }}
                            onStartDeviceCode={() => {
                                if (!selectedProviderId) {
                                    return;
                                }

                                void mutations.startAuthMutation.mutateAsync({
                                    profileId,
                                    providerId: selectedProviderId,
                                    method: 'device_code',
                                });
                            }}
                            onPollNow={() => {
                                if (!activeAuthFlow) {
                                    return;
                                }

                                void mutations.pollAuthMutation.mutateAsync({
                                    profileId,
                                    providerId: activeAuthFlow.providerId,
                                    flowId: activeAuthFlow.flowId,
                                });
                            }}
                            onCancelFlow={() => {
                                if (!activeAuthFlow) {
                                    return;
                                }

                                void mutations.cancelAuthMutation.mutateAsync({
                                    profileId,
                                    providerId: activeAuthFlow.providerId,
                                    flowId: activeAuthFlow.flowId,
                                });
                            }}
                        />

                        {selectedProvider.id === 'kilo' ? (
                            <section className='space-y-1'>
                                <p className='text-sm font-semibold'>Kilo Extras</p>
                                <p className='text-muted-foreground text-xs'>
                                    Cloud sessions and marketplace remain Kilo-gated and unlock after Kilo login.
                                </p>
                                <p className='text-muted-foreground text-xs'>
                                    Account state:{' '}
                                    {accountContextQuery.data?.authState.authState ?? selectedProvider.authState}
                                </p>
                            </section>
                        ) : null}

                        {selectedProvider.id === 'openai' ? (
                            <OpenAIAccountLimitsSection
                                isLoading={openAISubscriptionRateLimitsQuery.isLoading}
                                rateLimits={openAISubscriptionRateLimits}
                            />
                        ) : null}

                        {selectedProvider.id === 'openai' ? (
                            <OpenAILocalUsageSection
                                isLoading={openAISubscriptionUsageQuery.isLoading}
                                usage={openAISubscriptionUsage}
                            />
                        ) : null}
                    </div>
                ) : (
                    <p className='text-muted-foreground text-sm'>No providers available.</p>
                )}
            </div>
        </section>
    );
}
