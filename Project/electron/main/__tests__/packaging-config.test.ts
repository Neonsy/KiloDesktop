import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('electron-builder packaging config', () => {
    it('keeps native modules unpacked and excludes non-runtime folders', () => {
        const configPath = path.join(process.cwd(), 'electron-builder.json5');
        const contents = readFileSync(configPath, 'utf8');

        expect(contents).toContain("'**/node_modules/better-sqlite3/**'");
        expect(contents).toContain("'**/node_modules/keytar/**'");
        expect(contents).toContain("'!Research/**'");
        expect(contents).toContain("'!Markdown/**'");
        expect(contents).toContain("'!**/__tests__/**'");
    });
});
