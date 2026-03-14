import { useState } from 'react';

import { KiloSettingsView } from '@/web/components/settings/kiloSettingsView';
import { ProviderSettingsView } from '@/web/components/settings/providerSettingsView';

type ProvidersWorkspaceTab = 'kilo' | 'direct';

interface ProvidersWorkspaceViewProps {
    profileId: string;
}

export function ProvidersWorkspaceView({ profileId }: ProvidersWorkspaceViewProps) {
    const [activeTab, setActiveTab] = useState<ProvidersWorkspaceTab>('kilo');

    return (
        <section className='flex h-full min-h-0 min-w-0 flex-col overflow-hidden'>
            <div className='border-border/80 bg-background/40 flex shrink-0 flex-wrap items-center justify-end gap-2 border-b px-5 py-3 md:px-6'>
                <div className='flex flex-wrap gap-2'>
                    <button
                        type='button'
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                            activeTab === 'kilo'
                                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                : 'border-border bg-card hover:bg-accent'
                        }`}
                        onClick={() => {
                            setActiveTab('kilo');
                        }}>
                        Kilo
                    </button>
                    <button
                        type='button'
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                            activeTab === 'direct'
                                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                : 'border-border bg-card hover:bg-accent'
                        }`}
                        onClick={() => {
                            setActiveTab('direct');
                        }}>
                        Direct providers
                    </button>
                </div>
            </div>

            <div className='min-h-0 min-w-0 flex-1 overflow-hidden'>
                {activeTab === 'kilo' ? <KiloSettingsView profileId={profileId} /> : null}
                {activeTab === 'direct' ? <ProviderSettingsView profileId={profileId} /> : null}
            </div>
        </section>
    );
}
