import { ensureProviderExists } from '@/app/backend/providers/auth/authStateService';
import { errAuthExecution, okAuthExecution, type AuthExecutionResult } from '@/app/backend/providers/auth/errors';
import { logProviderAuthInfo, logProviderAuthWarn, type LogContext } from '@/app/backend/providers/auth/logging';
import type { RuntimeProviderId } from '@/app/backend/runtime/contracts';

async function ensureProviderRegistered(providerId: RuntimeProviderId): Promise<AuthExecutionResult<void>> {
    const result = await ensureProviderExists(providerId);
    if (result.isErr()) {
        return errAuthExecution(result.error.code, result.error.message);
    }

    return okAuthExecution(undefined);
}

export async function runCheckedAuthOperation<T>(input: {
    profileId: string;
    providerId: RuntimeProviderId;
    context: LogContext | undefined;
    failureMessage: string;
    successMessage?: string;
    failureFields?: Record<string, unknown>;
    successFields?: Record<string, unknown>;
    execute: () => Promise<AuthExecutionResult<T>>;
}): Promise<AuthExecutionResult<T>> {
    const providerCheck = await ensureProviderRegistered(input.providerId);
    if (providerCheck.isErr()) {
        return errAuthExecution(providerCheck.error.code, providerCheck.error.message);
    }

    const result = await input.execute();
    if (result.isErr()) {
        logProviderAuthWarn({
            message: input.failureMessage,
            fields: {
                profileId: input.profileId,
                providerId: input.providerId,
                code: result.error.code,
                error: result.error.message,
                ...(input.failureFields ?? {}),
            },
            context: input.context,
        });
        return errAuthExecution(result.error.code, result.error.message);
    }

    if (input.successMessage) {
        logProviderAuthInfo({
            message: input.successMessage,
            fields: {
                profileId: input.profileId,
                providerId: input.providerId,
                ...(input.successFields ?? {}),
            },
            context: input.context,
        });
    }

    return okAuthExecution(result.value);
}

export async function runLoggedAuthOperation<T>(input: {
    profileId: string;
    providerId: RuntimeProviderId;
    context: LogContext | undefined;
    failureMessage: string;
    successMessage?: string;
    failureFields?: Record<string, unknown>;
    successFields?: Record<string, unknown>;
    execute: () => Promise<AuthExecutionResult<T>>;
}): Promise<AuthExecutionResult<T>> {
    const result = await input.execute();
    if (result.isErr()) {
        logProviderAuthWarn({
            message: input.failureMessage,
            fields: {
                profileId: input.profileId,
                providerId: input.providerId,
                code: result.error.code,
                error: result.error.message,
                ...(input.failureFields ?? {}),
            },
            context: input.context,
        });
        return errAuthExecution(result.error.code, result.error.message);
    }

    if (input.successMessage) {
        logProviderAuthInfo({
            message: input.successMessage,
            fields: {
                profileId: input.profileId,
                providerId: input.providerId,
                ...(input.successFields ?? {}),
            },
            context: input.context,
        });
    }

    return okAuthExecution(result.value);
}
