/// <reference types="vite/client" />

declare module '*.wasm?url' {
    const wasmAssetUrl: string;
    export default wasmAssetUrl;
}

interface Window {
    neonSplash?: {
        onPhaseChange(listener: (phase: 'starting' | 'delayed') => void): () => void;
    };
}
