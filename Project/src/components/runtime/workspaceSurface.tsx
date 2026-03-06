import { ConversationShell } from '@/web/components/conversation/shell';
import { useWorkspaceSurfaceController } from '@/web/components/runtime/workspaceSurfaceController';
import { WorkspaceSurfaceHeader } from '@/web/components/runtime/workspaceSurfaceHeader';
import { SettingsSheet } from '@/web/components/settings/settingsSheet';

export function WorkspaceSurface() {
    const controller = useWorkspaceSurfaceController();

    return (
        <section className='flex min-h-0 flex-1 flex-col'>
            <WorkspaceSurfaceHeader
                profiles={controller.profiles}
                resolvedProfileId={controller.resolvedProfileId}
                topLevelTab={controller.topLevelTab}
                modes={controller.modes}
                activeModeKey={controller.activeModeKey}
                isSwitchingProfile={controller.profileSetActiveMutation.isPending}
                onTopLevelTabChange={controller.setTopLevelTab}
                onProfileChange={(profileId) => {
                    void controller.selectProfile(profileId);
                }}
                onOpenSettings={() => {
                    controller.setShowSettings(true);
                }}
                onModeChange={(modeKey) => {
                    void controller.selectMode(modeKey);
                }}
            />

            <div className='min-h-0 flex-1'>
                {controller.resolvedProfileId ? (
                    <ConversationShell
                        profileId={controller.resolvedProfileId}
                        topLevelTab={controller.topLevelTab}
                        modeKey={controller.activeModeKey}
                        onTopLevelTabChange={controller.setTopLevelTab}
                    />
                ) : (
                    <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
                        Loading profile state...
                    </div>
                )}
            </div>

            {controller.resolvedProfileId ? (
                <SettingsSheet
                    open={controller.showSettings}
                    profileId={controller.resolvedProfileId}
                    onClose={() => {
                        controller.setShowSettings(false);
                    }}
                    onProfileActivated={(profileId) => {
                        controller.setResolvedProfile(profileId);
                    }}
                />
            ) : null}
        </section>
    );
}
