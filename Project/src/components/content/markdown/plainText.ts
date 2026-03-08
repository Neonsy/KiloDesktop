import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import stripMarkdown from 'strip-markdown';
import { unified } from 'unified';

const plainTextProcessor = unified().use(remarkParse).use(remarkGfm).use(stripMarkdown).use(remarkStringify, {
    bullet: '-',
    fences: false,
    listItemIndent: 'one',
});

export function markdownToPlainText(markdown: string): string {
    const normalized = markdown.replace(/\r\n?/g, '\n').trim();
    if (normalized.length === 0) {
        return '';
    }

    const withPreservedCode = normalized
        .replace(/```[\w-]*\n([\s\S]*?)```/g, (_match, code: string) => `\n${code}\n`)
        .replace(/`([^`]+)`/g, '$1');

    return String(plainTextProcessor.processSync(withPreservedCode)).trim();
}
