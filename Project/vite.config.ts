import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import tsconfigPaths from 'vite-tsconfig-paths';

import { resolveElectronChildEnv } from './electron/main/runtime/electronChildEnv';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        devtools(),
        tsconfigPaths(),
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
        }),

        react({
            babel: {
                plugins: [['babel-plugin-react-compiler']],
            },
        }),
        tailwindcss(),
        electron({
            main: {
                entry: 'electron/main/index.ts',
                onstart({ startup }) {
                    void startup(['.', '--no-sandbox'], {
                        env: resolveElectronChildEnv(),
                    });
                },
                vite: {
                    plugins: [tsconfigPaths()],
                },
            },
            preload: {
                input: 'electron/main/preload/index.ts',
            },
        }),
    ],
});
