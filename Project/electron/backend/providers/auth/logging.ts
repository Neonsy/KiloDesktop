import { appLog } from '@/app/main/logging';

export interface LogContext {
    requestId?: string;
    correlationId?: string;
}

export function withLogContext(context?: LogContext): Record<string, string> {
    if (!context) {
        return {};
    }

    return {
        ...(context.requestId ? { requestId: context.requestId } : {}),
        ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    };
}

export function logProviderAuthInfo(input: {
    message: string;
    fields: Record<string, unknown>;
    context: LogContext | undefined;
}) {
    appLog.info({
        tag: 'provider.auth',
        message: input.message,
        ...input.fields,
        ...withLogContext(input.context),
    });
}

export function logProviderAuthWarn(input: {
    message: string;
    fields: Record<string, unknown>;
    context: LogContext | undefined;
}) {
    appLog.warn({
        tag: 'provider.auth',
        message: input.message,
        ...input.fields,
        ...withLogContext(input.context),
    });
}
