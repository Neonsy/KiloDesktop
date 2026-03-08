import type { MessageTimelineEntry } from '@/web/components/conversation/messages/messageTimelineModel';
import { isEntityId } from '@/web/components/conversation/shell/workspace/helpers';
import type { PendingMessageEdit } from '@/web/components/conversation/shellEditFlow';

export function createPendingMessageEdit(
    entry: MessageTimelineEntry,
    forcedMode?: PendingMessageEdit['forcedMode']
): PendingMessageEdit | undefined {
    if (!isEntityId(entry.id, 'msg')) {
        return undefined;
    }

    const editableText = entry.editableText?.trim();
    if (!editableText) {
        return undefined;
    }

    return {
        messageId: entry.id,
        initialText: editableText,
        ...(forcedMode ? { forcedMode } : {}),
    };
}
