import { describe, expect, it } from 'vitest';

import type { DiffRecord } from '@/app/backend/persistence/types';
import { buildDiffOverview } from '@/app/backend/runtime/services/diff/overview';

describe('diff overview', () => {
    it('derives status counts, line totals, top directories, and highlighted files', () => {
        const diff: DiffRecord = {
            id: 'diff_test',
            profileId: 'profile_test',
            sessionId: 'sess_test',
            runId: 'run_test',
            summary: '3 changed files',
            artifact: {
                kind: 'git',
                workspaceRootPath: 'C:\\repo',
                workspaceLabel: 'repo',
                baseRef: 'HEAD',
                fileCount: 3,
                totalAddedLines: 12,
                totalDeletedLines: 4,
                files: [
                    { path: 'src/app.ts', status: 'modified', addedLines: 7, deletedLines: 1 },
                    { path: 'src/lib/util.ts', status: 'added', addedLines: 5, deletedLines: 0 },
                    { path: 'README.md', status: 'modified', addedLines: 0, deletedLines: 3 },
                ],
                fullPatch: '',
                patchesByPath: {},
            },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };

        const overview = buildDiffOverview(diff);
        expect(overview.kind).toBe('git');
        if (overview.kind !== 'git') {
            throw new Error('Expected git overview.');
        }

        expect(overview.fileCount).toBe(3);
        expect(overview.totalAddedLines).toBe(12);
        expect(overview.totalDeletedLines).toBe(4);
        expect(overview.statusCounts.added).toBe(1);
        expect(overview.statusCounts.modified).toBe(2);
        expect(overview.topDirectories[0]?.directory).toBe('src');
        expect(overview.highlightedFiles[0]?.path).toBe('src/app.ts');
    });
});
