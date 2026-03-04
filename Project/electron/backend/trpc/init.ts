/**
 * tRPC initialization.
 * Creates the base router and procedure builders used by all routers.
 */

import { TRPCError, initTRPC } from '@trpc/server';
import { createRequestLogger } from 'evlog';
import { randomUUID } from 'node:crypto';

import type { Context } from '@/app/backend/trpc/context';
import { isAppLoggerEnabled } from '@/app/main/logging';

const t = initTRPC.context<Context>().create({
    // Marks this as server-side (main process) for tRPC internals
    isServer: true,
});

const TRPC_STATUS_BY_CODE = new Map<string, number>([
    ['BAD_REQUEST', 400],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['TIMEOUT', 408],
    ['CONFLICT', 409],
    ['TOO_MANY_REQUESTS', 429],
]);

const TRPC_CODE_BY_OPERATIONAL_ERROR_CODE = new Map<string, TRPCError['code']>([
    ['auth_missing', 'UNAUTHORIZED'],
    ['flow_not_found', 'NOT_FOUND'],
    ['invalid_payload', 'BAD_REQUEST'],
    ['cache_key_invalid', 'BAD_REQUEST'],
    ['runtime_option_invalid', 'BAD_REQUEST'],
    ['provider_auth_invalid_state', 'UNAUTHORIZED'],
    ['provider_auth_unsupported', 'BAD_REQUEST'],
    ['provider_model_missing', 'NOT_FOUND'],
    ['provider_model_not_available', 'BAD_REQUEST'],
    ['provider_not_authenticated', 'UNAUTHORIZED'],
    ['provider_not_registered', 'NOT_FOUND'],
    ['provider_not_supported', 'BAD_REQUEST'],
    ['provider_request_failed', 'INTERNAL_SERVER_ERROR'],
    ['provider_request_unavailable', 'TIMEOUT'],
    ['provider_secret_missing', 'UNAUTHORIZED'],
    ['refresh_token_missing', 'UNAUTHORIZED'],
    ['request_failed', 'INTERNAL_SERVER_ERROR'],
    ['request_unavailable', 'TIMEOUT'],
    ['schema_error', 'BAD_REQUEST'],
    ['timeout', 'TIMEOUT'],
]);

function mapTrpcCodeToStatus(code: unknown): number {
    if (typeof code !== 'string') {
        return 500;
    }

    return TRPC_STATUS_BY_CODE.get(code) ?? 500;
}

function mapOperationalErrorCodeToTrpcCode(code: string | undefined): TRPCError['code'] | undefined {
    if (!code) {
        return undefined;
    }

    return TRPC_CODE_BY_OPERATIONAL_ERROR_CODE.get(code);
}

function extractErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object' || !('code' in error)) {
        return undefined;
    }

    const { code } = error as { code?: unknown };
    return typeof code === 'string' ? code : undefined;
}

function normalizeError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }

    return new Error(typeof error === 'string' ? error : 'Unknown tRPC error');
}

function normalizeBoundaryError(error: unknown): Error {
    const normalized = normalizeError(error);
    if (normalized instanceof TRPCError) {
        return normalized;
    }

    const operationalTrpcCode = mapOperationalErrorCodeToTrpcCode(extractErrorCode(normalized));
    if (operationalTrpcCode) {
        return new TRPCError({
            code: operationalTrpcCode,
            message: normalized.message,
            cause: normalized,
        });
    }

    if (normalized.message.startsWith('Invalid "')) {
        return new TRPCError({
            code: 'BAD_REQUEST',
            message: normalized.message,
            cause: normalized,
        });
    }

    return normalized;
}

const trpcRequestLoggingMiddleware = t.middleware(async (opts) => {
    if (!isAppLoggerEnabled()) {
        return opts.next();
    }

    const requestId = randomUUID();
    const requestLog = createRequestLogger({
        method: opts.type.toUpperCase(),
        path: `trpc.${opts.path}`,
        requestId,
    });

    requestLog.set({
        senderId: opts.ctx.senderId,
        ...(opts.ctx.win?.id ? { windowId: opts.ctx.win.id } : {}),
    });

    try {
        const result = await opts.next();

        if (result.ok) {
            requestLog.emit({ status: 200 });
            return result;
        }

        const errorCode = extractErrorCode(result.error);

        requestLog.error(normalizeError(result.error), {
            ...(errorCode ? { trpcCode: errorCode } : {}),
        });
        requestLog.emit({ status: mapTrpcCodeToStatus(errorCode) });

        return result;
    } catch (error: unknown) {
        const normalizedError = normalizeBoundaryError(error);
        const errorCode = extractErrorCode(normalizedError);

        requestLog.error(normalizedError, {
            ...(errorCode ? { trpcCode: errorCode } : {}),
        });
        requestLog.emit({ status: mapTrpcCodeToStatus(errorCode) });

        throw normalizedError;
    }
});

export const router = t.router;
export const publicProcedure = t.procedure.use(trpcRequestLoggingMiddleware);
export const middleware = t.middleware;
