import { useWindowStateStreamStore } from '@/web/lib/window/stateStream';
import { trpc } from '@/web/trpc/client';

export interface TitleBarWindowControls {
    platform: 'darwin' | 'win32' | 'linux';
    isMac: boolean;
    isMaximized: boolean;
    isFullScreen: boolean;
    canMaximize: boolean;
    canMinimize: boolean;
    controlsDisabled: boolean;
    isClosing: boolean;
    minimizeWindow: () => void;
    toggleMaximizeWindow: () => void;
    closeWindow: () => void;
}

export function useTitleBarWindowControls(): TitleBarWindowControls {
    const windowState = useWindowStateStreamStore((state) => state.windowState);

    const minimizeMutation = trpc.system.minimizeWindow.useMutation();
    const toggleMaximizeMutation = trpc.system.toggleMaximizeWindow.useMutation();
    const closeMutation = trpc.system.closeWindow.useMutation();

    function minimizeWindow(): void {
        minimizeMutation.mutate();
    }

    function toggleMaximizeWindow(): void {
        toggleMaximizeMutation.mutate();
    }

    function closeWindow(): void {
        closeMutation.mutate();
    }

    const platform: TitleBarWindowControls['platform'] =
        windowState.platform === 'darwin' || windowState.platform === 'win32' ? windowState.platform : 'linux';

    return {
        platform,
        isMac: platform === 'darwin',
        isMaximized: windowState.isMaximized,
        isFullScreen: windowState.isFullScreen,
        canMaximize: windowState.canMaximize,
        canMinimize: windowState.canMinimize,
        controlsDisabled: minimizeMutation.isPending || toggleMaximizeMutation.isPending || closeMutation.isPending,
        isClosing: closeMutation.isPending,
        minimizeWindow,
        toggleMaximizeWindow,
        closeWindow,
    };
}
