import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MessageTimelineItem } from '@/web/components/conversation/messages/messageTimeline';

describe('message timeline assistant placeholders', () => {
    it('shows a responding placeholder before assistant output arrives', () => {
        const html = renderToStaticMarkup(
            <MessageTimelineItem
                profileId='profile_default'
                entry={{
                    id: 'msg_assistant',
                    runId: 'run_default',
                    role: 'assistant',
                    createdAt: '2026-03-12T09:00:00.000Z',
                    body: [],
                }}
                runStatus='running'
                canBranch={false}
            />
        );

        expect(html).toContain('Assistant is responding');
    });

    it('shows a concrete failure message when a run ends before assistant output arrives', () => {
        const html = renderToStaticMarkup(
            <MessageTimelineItem
                profileId='profile_default'
                entry={{
                    id: 'msg_assistant',
                    runId: 'run_default',
                    role: 'assistant',
                    createdAt: '2026-03-12T09:00:00.000Z',
                    body: [],
                }}
                runStatus='error'
                runErrorMessage='Provider stream dropped.'
                canBranch={false}
            />
        );

        expect(html).toContain('Run failed before any assistant output was recorded.');
        expect(html).toContain('Provider stream dropped.');
    });
});
