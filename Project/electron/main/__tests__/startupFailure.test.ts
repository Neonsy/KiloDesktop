import { describe, expect, it } from 'vitest';

import { resolveStartupFailureDialog } from '@/app/main/bootstrap/startupFailure';

describe('startup failure diagnostics', () => {
    it('falls back to a generic startup message for other failures', () => {
        const dialog = resolveStartupFailureDialog(new Error('Generic startup failure'));

        expect(dialog.title).toBe('NeonConductor Failed To Start');
        expect(dialog.message).toContain('Generic startup failure');
    });
});
