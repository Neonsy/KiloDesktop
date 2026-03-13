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
            <div className='border-border/80 bg-background/40 flex shrink-0 flex-wrap items-end justify-between gap-3 border-b px-5 py-4 md:px-6'>
                <div className='space-y-1'>
                    <h4 className='text-xl font-semibold text-balance'>Providers & Models</h4>
                    <p className='text-muted-foreground max-w-3xl text-sm leading-6'>
                        Keep Kilo and direct providers in one destination. Authentication, connection profiles, and
                        default model choices stay grouped by provider, not scattered across settings.
                    </p>
                </div>

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
