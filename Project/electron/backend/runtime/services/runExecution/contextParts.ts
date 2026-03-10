import { Buffer } from 'node:buffer';

import type { ComposerImageAttachmentInput } from '@/app/backend/runtime/contracts';
import type { RunContextMessage, RunContextPart } from '@/app/backend/runtime/services/runExecution/types';

export function createTextPart(text: string): RunContextPart | null {
    const normalized = text.trim();
    if (normalized.length === 0) {
        return null;
    }

    return {
        type: 'text',
        text: normalized,
    };
}

export function createTextMessage(
    role: RunContextMessage['role'],
    text: string
): RunContextMessage {
    const textPart = createTextPart(text);
    return {
        role,
        parts: textPart ? [textPart] : [],
    };
}

export function appendPromptMessage(input: {
    messages: RunContextMessage[];
    prompt: string;
    attachments?: ComposerImageAttachmentInput[];
}): RunContextMessage[] {
    const parts: RunContextPart[] = [];
    const promptPart = createTextPart(input.prompt);
    if (promptPart) {
        parts.push(promptPart);
    }

    for (const attachment of input.attachments ?? []) {
        parts.push({
            type: 'image',
            dataUrl: `data:${attachment.mimeType};base64,${attachment.bytesBase64}`,
            sha256: attachment.sha256,
            mimeType: attachment.mimeType,
            width: attachment.width,
            height: attachment.height,
        });
    }

    if (parts.length === 0) {
        return input.messages;
    }

    return [
        ...input.messages,
        {
            role: 'user',
            parts,
        },
    ];
}

export function extractTextFromParts(parts: RunContextPart[]): string {
    return parts
        .filter((part): part is Extract<RunContextPart, { type: 'text' }> => part.type === 'text')
        .map((part) => part.text)
        .join('\n\n')
        .trim();
}

export function hasImageParts(messages: RunContextMessage[]): boolean {
    return messages.some((message) => message.parts.some((part) => part.type === 'image'));
}

export function hashablePartContent(part: RunContextPart): string {
    if (part.type === 'text') {
        return part.text;
    }

    return [part.mediaId ?? '', part.sha256 ?? '', part.mimeType, String(part.width), String(part.height)].join('|');
}

export function decodeAttachmentBytes(attachment: ComposerImageAttachmentInput): Uint8Array {
    return Uint8Array.from(Buffer.from(attachment.bytesBase64, 'base64'));
}
