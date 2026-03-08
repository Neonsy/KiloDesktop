import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveElectronChildEnv } from '@/app/main/runtime/electronChildEnv';

describe('electron-builder packaging config', () => {
    it('excludes non-runtime folders from desktop packaging', () => {
        const configPath = path.join(process.cwd(), 'electron-builder.json5');
        const contents = readFileSync(configPath, 'utf8');

        expect(contents).toContain("'!Research/**'");
        expect(contents).toContain("'!Markdown/**'");
        expect(contents).toContain("'!**/__tests__/**'");
    });

    it('does not keep stale native-addon unpack policy', () => {
        const configPath = path.join(process.cwd(), 'electron-builder.json5');
        const contents = readFileSync(configPath, 'utf8');

        expect(contents).not.toContain('asarUnpack');
    });

    it('keeps package main pointed at the Electron main bundle entry', () => {
        const packagePath = path.join(process.cwd(), 'package.json');
        const contents = JSON.parse(readFileSync(packagePath, 'utf8')) as {
            main: string;
        };

        expect(contents.main).toBe('dist-electron/index.js');
    });

    it('sanitizes the Electron child environment', () => {
        const childEnv = resolveElectronChildEnv({
            ELECTRON_RUN_AS_NODE: '1',
            PATH: 'test-path',
        });

        expect(childEnv.ELECTRON_RUN_AS_NODE).toBeUndefined();
        expect(childEnv.PATH).toBe('test-path');
    });
});
