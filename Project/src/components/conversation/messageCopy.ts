import { markdownToPlainText } from '@/web/components/content/markdown/plainText';
import type { MessageTimelineBodyEntry, MessageTimelineEntry } from '@/web/components/conversation/messageTimelineModel';

function entryLabel(entry: MessageTimelineBodyEntry): string | undefined {
    if (entry.type !== 'assistant_reasoning') {
        return undefined;
    }

    return entry.providerLimitedReasoning ? 'Reasoning (provider-limited)' : 'Reasoning';
}

function prefixSection(label: string | undefined, text: string): string {
    return label ? `${label}:\n${text}` : text;
}

function buildCopyPayload(input: {
    body: MessageTimelineEntry['body'];
    mode: 'plain' | 'raw';
}): string {
    const sections = input.body
        .map((bodyEntry) => {
            const sourceText = bodyEntry.text.trim();
            if (sourceText.length === 0) {
                return null;
            }

            const text = input.mode === 'raw' ? sourceText : markdownToPlainText(sourceText);
            const normalized = text.trim();
            if (normalized.length === 0) {
                return null;
            }

            return prefixSection(entryLabel(bodyEntry), normalized);
        })
        .filter((value): value is string => Boolean(value));

    return sections.join('\n\n').trim();
}

export function buildMessageCopyPayloads(entry: MessageTimelineEntry): {
    plainText: string;
    rawText: string;
} {
    return {
        plainText: buildCopyPayload({ body: entry.body, mode: 'plain' }),
        rawText: buildCopyPayload({ body: entry.body, mode: 'raw' }),
    };
}
