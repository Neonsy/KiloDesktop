/// <reference types="vite/client" />

import type { BootStatusSnapshot } from '@/app/shared/splashContract';
import type { PickDirectoryResult } from '@/app/shared/desktopBridgeContract';

declare module '*.wasm?url' {
    const wasmAssetUrl: string;
    export default wasmAssetUrl;
}

declare global {
    interface Window {
        neonDesktop?: {
            pickDirectory(): Promise<PickDirectoryResult>;
        };
        neonSplash?: {
            getBootstrapPayload(): {
                mascotSource: string | null;
                status: BootStatusSnapshot;
            };
            onStatusChange(listener: (status: BootStatusSnapshot) => void): () => void;
        };
    }
}

export {};
