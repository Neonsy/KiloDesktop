import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceSurfaceHeader } from '@/web/components/runtime/workspaceSurfaceHeader';

describe('workspace surface header', () => {
    it('keeps global navigation out of the header and leaves profile controls only', () => {
        const html = renderToStaticMarkup(
            <WorkspaceSurfaceHeader
                profiles={[{ id: 'profile_default', name: 'Local Default' }]}
                resolvedProfileId='profile_default'
                isSwitchingProfile={false}
                onProfileChange={vi.fn()}
                onOpenSettings={vi.fn()}
            />
        );

        expect(html).toContain('Workspace');
        expect(html).toContain('Profile');
        expect(html).toContain('Settings');
        expect(html).not.toContain('Orchestrator');
        expect(html).not.toContain('Agent');
        expect(html).not.toContain('Chat');
    });
});
