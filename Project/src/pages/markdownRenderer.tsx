import { useMemo, useState } from 'react';

import type { ReactNode } from 'react';

type MarkdownBlock =
    | { type: 'heading'; level: 2 | 3; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'list'; items: string[] }
    | { type: 'code'; language: string; code: string };

interface MarkdownRendererProps {
    content: string;
}

interface HighlightedCodeProps {
    language: string;
    code: string;
    title?: string;
    copyEnabled?: boolean;
}

interface HighlightToken {
    text: string;
    className: string;
}

function parseMarkdown(content: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let index = 0;

    while (index < lines.length) {
        const line = lines[index]?.trimEnd() ?? '';

        if (!line.trim()) {
            index += 1;
            continue;
        }

        if (line.startsWith('```')) {
            const language = line.slice(3).trim() || 'text';
            index += 1;
            const codeLines: string[] = [];

            while (index < lines.length && !(lines[index] ?? '').trimStart().startsWith('```')) {
                codeLines.push(lines[index] ?? '');
                index += 1;
            }

            if (index < lines.length) {
                index += 1;
            }

            blocks.push({
                type: 'code',
                language,
                code: codeLines.join('\n'),
            });
            continue;
        }

        if (line.startsWith('### ')) {
            blocks.push({ type: 'heading', level: 3, text: line.slice(4) });
            index += 1;
            continue;
        }

        if (line.startsWith('## ')) {
            blocks.push({ type: 'heading', level: 2, text: line.slice(3) });
            index += 1;
            continue;
        }

        if (line.startsWith('- ')) {
            const items: string[] = [];
            while (index < lines.length && (lines[index] ?? '').trimStart().startsWith('- ')) {
                items.push((lines[index] ?? '').trimStart().slice(2));
                index += 1;
            }
            blocks.push({ type: 'list', items });
            continue;
        }

        const paragraphLines: string[] = [];
        while (index < lines.length) {
            const candidate = lines[index] ?? '';
            if (
                !candidate.trim() ||
                candidate.trimStart().startsWith('```') ||
                candidate.trimStart().startsWith('- ') ||
                candidate.trimStart().startsWith('##')
            ) {
                break;
            }
            paragraphLines.push(candidate.trim());
            index += 1;
        }
        blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
    }

    return blocks;
}

function renderInline(text: string): ReactNode[] {
    const chunks = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

    return chunks.map((chunk, idx) => {
        if (chunk.startsWith('`') && chunk.endsWith('`')) {
            return (
                <code key={`${chunk}-${String(idx)}`} className='md-inline-code'>
                    {chunk.slice(1, -1)}
                </code>
            );
        }

        if (chunk.startsWith('**') && chunk.endsWith('**')) {
            return (
                <strong key={`${chunk}-${String(idx)}`} className='md-strong'>
                    {chunk.slice(2, -2)}
                </strong>
            );
        }

        return <span key={`${chunk}-${String(idx)}`}>{chunk}</span>;
    });
}

function tokenizeLine(line: string, language: string): HighlightToken[] {
    const tsPattern =
        /(\/\/.*$|"[^"]*"|'[^']*'|`[^`]*`|\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|export|from|type|interface|extends|implements|new|class|async|await|try|catch|throw)\b|\b\d+\b)/g;
    const bashPattern =
        /(#.*$|"[^"]*"|'[^']*'|\$[A-Za-z_][A-Za-z0-9_]*|\b(?:echo|cd|ls|cat|cp|mv|rm|mkdir|pnpm|npm|git|node|npx|tsx|touch)\b|\b\d+\b)/g;

    const pattern = language === 'ts' || language === 'tsx' ? tsPattern : language === 'bash' ? bashPattern : null;

    if (!pattern) {
        return [{ text: line || ' ', className: 'token-plain' }];
    }

    const tokens: HighlightToken[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(line);

    while (match) {
        const [raw] = match;
        if (match.index > lastIndex) {
            tokens.push({ text: line.slice(lastIndex, match.index), className: 'token-plain' });
        }

        let className = 'token-plain';
        if (raw.startsWith('//') || raw.startsWith('#')) {
            className = 'token-comment';
        } else if (raw.startsWith('"') || raw.startsWith("'") || raw.startsWith('`')) {
            className = 'token-string';
        } else if (/^\d+$/.test(raw)) {
            className = 'token-number';
        } else if (raw.startsWith('$')) {
            className = 'token-variable';
        } else {
            className = 'token-keyword';
        }

        tokens.push({ text: raw, className });
        lastIndex = match.index + raw.length;
        match = pattern.exec(line);
    }

    if (lastIndex < line.length) {
        tokens.push({ text: line.slice(lastIndex), className: 'token-plain' });
    }

    if (!tokens.length) {
        tokens.push({ text: ' ', className: 'token-plain' });
    }

    return tokens;
}

function HighlightedCode({ language, code, title, copyEnabled = true }: HighlightedCodeProps) {
    const [copied, setCopied] = useState(false);

    const lines = useMemo(() => code.split('\n'), [code]);
    const normalizedLanguage = useMemo(() => {
        if (language === 'typescript') {
            return 'ts';
        }
        if (language === 'shell' || language === 'sh') {
            return 'bash';
        }
        return language;
    }, [language]);

    const handleCopy = () => {
        void navigator.clipboard
            .writeText(code)
            .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1100);
            })
            .catch(() => {
                setCopied(false);
            });
    };

    return (
        <div className='code-block'>
            <div className='code-block-header'>
                <span>{title ?? normalizedLanguage}</span>
                {copyEnabled ? (
                    <button type='button' onClick={handleCopy} className='code-copy-btn'>
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                ) : null}
            </div>
            <pre>
                <code>
                    {lines.map((line, lineIndex) => (
                        <span className='code-line' key={`${String(lineIndex)}-${line}`}>
                            <span className='code-line-no'>{lineIndex + 1}</span>
                            <span className='code-line-content'>
                                {tokenizeLine(line, normalizedLanguage).map((token, tokenIndex) => (
                                    <span key={`${String(tokenIndex)}-${token.text}`} className={token.className}>
                                        {token.text}
                                    </span>
                                ))}
                            </span>
                        </span>
                    ))}
                </code>
            </pre>
        </div>
    );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const blocks = useMemo(() => parseMarkdown(content), [content]);

    return (
        <div className='markdown-body'>
            {blocks.map((block, index) => {
                if (block.type === 'heading') {
                    return block.level === 2 ? (
                        <h2 key={`${block.text}-${String(index)}`}>{renderInline(block.text)}</h2>
                    ) : (
                        <h3 key={`${block.text}-${String(index)}`}>{renderInline(block.text)}</h3>
                    );
                }

                if (block.type === 'list') {
                    return (
                        <ul key={`list-${String(index)}`}>
                            {block.items.map((item, itemIndex) => (
                                <li key={`${item}-${String(itemIndex)}`}>{renderInline(item)}</li>
                            ))}
                        </ul>
                    );
                }

                if (block.type === 'code') {
                    return (
                        <HighlightedCode
                            key={`code-${String(index)}`}
                            language={block.language}
                            code={block.code}
                            title={`${block.language} snippet`}
                        />
                    );
                }

                return <p key={`paragraph-${String(index)}`}>{renderInline(block.text)}</p>;
            })}
        </div>
    );
}

export function FilePreviewCode({ language, code, title }: Omit<HighlightedCodeProps, 'copyEnabled'>) {
    if (title) {
        return <HighlightedCode language={language} code={code} title={title} copyEnabled={false} />;
    }

    return <HighlightedCode language={language} code={code} copyEnabled={false} />;
}
