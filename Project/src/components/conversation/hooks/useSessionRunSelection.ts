import { useEffect } from 'react';

import type {
    MessagePartRecord,
    MessageRecord,
    RunRecord,
    SessionSummaryRecord,
} from '@/app/backend/persistence/types';

interface UseSessionRunSelectionInput {
    allSessions: SessionSummaryRecord[];
    allRuns: RunRecord[];
    allMessages: MessageRecord[];
    allMessageParts: MessagePartRecord[];
    selectedThreadId: string | undefined;
    selectedSessionId: string | undefined;
    selectedRunId: string | undefined;
    onSelectedSessionInvalid: () => void;
    onSelectFallbackSession: (sessionId: string) => void;
    onSelectedRunInvalid: () => void;
    onSelectFallbackRun: (runId: string) => void;
}

export interface SessionRunSelectionState {
    sessions: SessionSummaryRecord[];
    runs: RunRecord[];
    messages: MessageRecord[];
    partsByMessageId: Map<string, MessagePartRecord[]>;
}

export function useSessionRunSelection(input: UseSessionRunSelectionInput): SessionRunSelectionState {
    const sessions = !input.selectedThreadId
        ? []
        : input.allSessions
              .filter((session) => session.threadId === input.selectedThreadId)
              .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    useEffect(() => {
        if (sessions.length === 0) {
            input.onSelectedSessionInvalid();
            return;
        }

        if (input.selectedSessionId && sessions.some((session) => session.id === input.selectedSessionId)) {
            return;
        }

        const firstSession = sessions.at(0);
        if (firstSession) {
            input.onSelectFallbackSession(firstSession.id);
        }
    }, [input.onSelectFallbackSession, input.onSelectedSessionInvalid, input.selectedSessionId, sessions]);

    const runs = !input.selectedSessionId
        ? []
        : input.allRuns
              .filter((run) => run.sessionId === input.selectedSessionId)
              .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    useEffect(() => {
        if (runs.length === 0) {
            input.onSelectedRunInvalid();
            return;
        }

        if (input.selectedRunId && runs.some((run) => run.id === input.selectedRunId)) {
            return;
        }

        const firstRun = runs.at(0);
        if (firstRun) {
            input.onSelectFallbackRun(firstRun.id);
        }
    }, [input.onSelectFallbackRun, input.onSelectedRunInvalid, input.selectedRunId, runs]);

    const messages = !input.selectedSessionId
        ? []
        : input.allMessages
              .filter((message) => message.sessionId === input.selectedSessionId)
              .filter((message) => (input.selectedRunId ? message.runId === input.selectedRunId : true))
              .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    const partsByMessageId = new Map<string, MessagePartRecord[]>();
    const selectedMessageIds = new Set(messages.map((message) => message.id));

    for (const part of input.allMessageParts) {
        if (!selectedMessageIds.has(part.messageId)) {
            continue;
        }

        const existing = partsByMessageId.get(part.messageId) ?? [];
        existing.push(part);
        partsByMessageId.set(part.messageId, existing);
    }

    for (const parts of partsByMessageId.values()) {
        parts.sort((left, right) => left.sequence - right.sequence);
    }

    return {
        sessions,
        runs,
        messages,
        partsByMessageId,
    };
}
