import { useEffect, useState } from 'react';

import type { KiloRoutingDraft } from '@/web/components/settings/providerSettings/types';

import type { KiloModelProviderInfo, RuntimeProviderId } from '@/app/backend/runtime/contracts';

interface UseKiloRoutingDraftInput {
    profileId: string;
    selectedProviderId: RuntimeProviderId | undefined;
    selectedModelId: string;
    preference:
        | {
              routingMode: 'dynamic' | 'pinned';
              sort?: 'default' | 'price' | 'throughput' | 'latency';
              pinnedProviderId?: string;
          }
        | undefined;
    providerOptions: KiloModelProviderInfo[];
    setStatusMessage: (message: string | undefined) => void;
    savePreference: (
        input:
            | {
                  profileId: string;
                  providerId: 'kilo';
                  modelId: string;
                  routingMode: 'dynamic';
                  sort: 'default' | 'price' | 'throughput' | 'latency';
              }
            | {
                  profileId: string;
                  providerId: 'kilo';
                  modelId: string;
                  routingMode: 'pinned';
                  pinnedProviderId: string;
              }
    ) => Promise<void>;
}

export function useKiloRoutingDraft(input: UseKiloRoutingDraftInput) {
    const [kiloRoutingDraft, setKiloRoutingDraft] = useState<KiloRoutingDraft | undefined>(undefined);

    useEffect(() => {
        if (input.selectedProviderId !== 'kilo' || input.selectedModelId.trim().length === 0) {
            setKiloRoutingDraft(undefined);
            return;
        }

        const preference = input.preference;
        if (!preference) {
            setKiloRoutingDraft({
                routingMode: 'dynamic',
                sort: 'default',
                pinnedProviderId: '',
            });
            return;
        }

        if (preference.routingMode === 'dynamic') {
            setKiloRoutingDraft({
                routingMode: 'dynamic',
                sort: preference.sort ?? 'default',
                pinnedProviderId: '',
            });
            return;
        }

        setKiloRoutingDraft({
            routingMode: 'pinned',
            sort: 'default',
            pinnedProviderId: preference.pinnedProviderId ?? '',
        });
    }, [input.preference, input.selectedModelId, input.selectedProviderId]);

    const saveKiloRoutingPreference = async (nextDraft: KiloRoutingDraft): Promise<void> => {
        if (input.selectedProviderId !== 'kilo' || input.selectedModelId.trim().length === 0) {
            return;
        }

        const previousDraft = kiloRoutingDraft;
        setKiloRoutingDraft(nextDraft);

        try {
            if (nextDraft.routingMode === 'dynamic') {
                await input.savePreference({
                    profileId: input.profileId,
                    providerId: 'kilo',
                    modelId: input.selectedModelId,
                    routingMode: 'dynamic',
                    sort: nextDraft.sort,
                });
            } else {
                if (nextDraft.pinnedProviderId.trim().length === 0) {
                    input.setStatusMessage('Select a provider before enabling pinned routing.');
                    setKiloRoutingDraft(previousDraft);
                    return;
                }

                await input.savePreference({
                    profileId: input.profileId,
                    providerId: 'kilo',
                    modelId: input.selectedModelId,
                    routingMode: 'pinned',
                    pinnedProviderId: nextDraft.pinnedProviderId,
                });
            }

            input.setStatusMessage('Kilo routing preference saved.');
        } catch {
            input.setStatusMessage('Failed to save Kilo routing preference.');
            setKiloRoutingDraft(previousDraft);
        }
    };

    return {
        kiloRoutingDraft,
        saveKiloRoutingPreference,
        setKiloRoutingDraft,
    };
}
