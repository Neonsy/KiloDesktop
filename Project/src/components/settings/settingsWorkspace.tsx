import { ArrowLeft } from 'lucide-react';
import { startTransition, useState } from 'react';

import { AppSettingsView } from '@/web/components/settings/appSettings/view';
import { ContextSettingsView } from '@/web/components/settings/contextSettingsView';
import { ProfileSettingsView } from '@/web/components/settings/profileSettingsView';
import { ProvidersWorkspaceView } from '@/web/components/settings/providersWorkspace/view';
import { RegistrySettingsView } from '@/web/components/settings/registrySettingsView';
import { usePrivacyMode } from '@/web/lib/privacy/privacyContext';

type SettingsWorkspaceSection = 'providers' | 'profiles' | 'context' | 'skills' | 'app';

const SETTINGS_SECTIONS: ReadonlyArray<SettingsWorkspaceSection> = ['providers', 'profiles', 'context', 'skills', 'app'];

const SECTION_LABELS: Record<SettingsWorkspaceSection, string> = {
    providers: 'Providers & Models',
    profiles: 'Profiles',
    context: 'Context & Limits',
    skills: 'Skills & Registry',
    app: 'App',
};

interface SettingsWorkspaceProps {
    profileId: string;
    onProfileActivated: (profileId: string) => void;
    onReturnToSessions: () => void;
}

export function SettingsWorkspace({ profileId, onProfileActivated, onReturnToSessions }: SettingsWorkspaceProps) {
    const [activeSection, setActiveSection] = useState<SettingsWorkspaceSection>('providers');
    const privacyMode = usePrivacyMode();

    return (
        <section className='flex h-full min-h-0 min-w-0 flex-1 overflow-hidden'>
            <aside className='border-border/80 bg-background/70 flex w-[248px] shrink-0 flex-col gap-4 border-r p-4'>
                <div className='space-y-3'>
                    <button
                        type='button'
                        className='border-border bg-card hover:bg-accent inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors'
                        aria-label='Back to sessions'
                        title='Back to sessions'
                        onClick={onReturnToSessions}>
                        <ArrowLeft className='h-4 w-4' />
                    </button>

                    <div className='space-y-1'>
                        <h2 className='text-sm font-semibold tracking-[0.18em] uppercase'>Settings</h2>
                        <p className='text-muted-foreground text-xs'>Choose an area to configure.</p>
                        {privacyMode.enabled ? (
                            <p className='text-primary text-[11px] font-semibold tracking-[0.12em] uppercase'>
                                Privacy mode active
                            </p>
                        ) : null}
                    </div>
                </div>

                <nav aria-label='Settings sections' className='space-y-1.5'>
                    {SETTINGS_SECTIONS.map((section) => (
                        <button
                            key={section}
                            type='button'
                            className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                                activeSection === section
                                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                    : 'border-border/80 bg-card/70 hover:bg-accent'
                            }`}
                            onClick={() => {
                                startTransition(() => {
                                    setActiveSection(section);
                                });
                            }}>
                            <p className='text-sm font-medium'>{SECTION_LABELS[section]}</p>
                        </button>
                    ))}
                </nav>
            </aside>

            <div className='bg-background/20 h-full min-h-0 min-w-0 flex-1 overflow-hidden'>
                {activeSection === 'providers' ? <ProvidersWorkspaceView profileId={profileId} /> : null}
                {activeSection === 'profiles' ? (
                    <ProfileSettingsView activeProfileId={profileId} onProfileActivated={onProfileActivated} />
                ) : null}
                {activeSection === 'context' ? <ContextSettingsView activeProfileId={profileId} /> : null}
                {activeSection === 'skills' ? <RegistrySettingsView profileId={profileId} /> : null}
                {activeSection === 'app' ? <AppSettingsView /> : null}
            </div>
        </section>
    );
}
