import type { ProviderAuthStateRecord } from '@/app/backend/persistence/types';
import {
    getAccountContext,
    setOrganization as setOrganizationContext,
} from '@/app/backend/providers/auth/authAccountContextService';
import {
    clearAuth,
    ensureProviderExists,
    getAuthState,
    setApiKey,
    persistAuthenticatedState,
} from '@/app/backend/providers/auth/authStateService';
import { listProviderAuthMethods } from '@/app/backend/providers/auth/constants';
import { errAuthExecution, okAuthExecution, type AuthExecutionResult } from '@/app/backend/providers/auth/errors';
import { refreshOpenAIToken } from '@/app/backend/providers/auth/openaiOAuthClient';
import { cancelAuthFlow, completeAuthFlow, pollAuthFlow } from '@/app/backend/providers/auth/pollAuthFlow';
import { readSecretValue } from '@/app/backend/providers/auth/secretRefs';
import { startAuthFlow } from '@/app/backend/providers/auth/startAuthFlow';
import type { PollAuthResult, ProviderAccountContextResult, StartAuthResult } from '@/app/backend/providers/auth/types';
import type { ProviderAuthMethod, RuntimeProviderId } from '@/app/backend/runtime/contracts';
import { appLog } from '@/app/main/logging';

interface LogContext {
    requestId?: string;
    correlationId?: string;
}

function withLogContext(context?: LogContext): Record<string, string> {
    if (!context) {
        return {};
    }

    return {
        ...(context.requestId ? { requestId: context.requestId } : {}),
        ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    };
}

export class ProviderAuthExecutionService {
    private readonly refreshLocks = new Map<string, Promise<AuthExecutionResult<ProviderAuthStateRecord>>>();

    listAuthMethods(profileId: string): Array<{ providerId: RuntimeProviderId; methods: ProviderAuthMethod[] }> {
        void profileId;
        return listProviderAuthMethods();
    }

    getAuthState(profileId: string, providerId: RuntimeProviderId): Promise<ProviderAuthStateRecord> {
        return getAuthState(profileId, providerId);
    }

    async setApiKey(
        profileId: string,
        providerId: RuntimeProviderId,
        apiKey: string,
        context?: LogContext
    ): Promise<AuthExecutionResult<ProviderAuthStateRecord>> {
        const result = await setApiKey(profileId, providerId, apiKey);
        if (result.isErr()) {
            appLog.warn({
                tag: 'provider.auth',
                message: 'Failed to set provider API key.',
                profileId,
                providerId,
                code: result.error.code,
                error: result.error.message,
                ...withLogContext(context),
            });
            return errAuthExecution(result.error.code, result.error.message);
        }

        return okAuthExecution(result.value);
    }

    async clearAuth(
        profileId: string,
        providerId: RuntimeProviderId,
        context?: LogContext
    ): Promise<AuthExecutionResult<{ cleared: boolean; authState: ProviderAuthStateRecord }>> {
        const result = await clearAuth(profileId, providerId);
        if (result.isErr()) {
            appLog.warn({
                tag: 'provider.auth',
                message: 'Failed to clear provider auth.',
                profileId,
                providerId,
                code: result.error.code,
                error: result.error.message,
                ...withLogContext(context),
            });
            return errAuthExecution(result.error.code, result.error.message);
        }

        return okAuthExecution(result.value);
    }

    async startAuth(
        input: {
            profileId: string;
            providerId: RuntimeProviderId;
            method: ProviderAuthMethod;
        },
        context?: LogContext
    ): Promise<AuthExecutionResult<StartAuthResult>> {
        const providerCheck = await ensureProviderExists(input.providerId);
        if (providerCheck.isErr()) {
            return errAuthExecution(providerCheck.error.code, providerCheck.error.message);
        }
        const result = await startAuthFlow(input);
        if (result.isErr()) {
            appLog.warn({
                tag: 'provider.auth',
                message: 'Failed to start provider auth flow.',
                profileId: input.profileId,
                providerId: input.providerId,
                method: input.method,
                code: result.error.code,
                error: result.error.message,
                ...withLogContext(context),
            });
            return errAuthExecution(result.error.code, result.error.message);
        }

        appLog.info({
            tag: 'provider.auth',
            message: 'Started provider auth flow.',
            profileId: input.profileId,
            providerId: input.providerId,
            method: input.method,
            flowId: result.value.flow.id,
            ...withLogContext(context),
        });

        return okAuthExecution(result.value);
    }

    async pollAuth(
        input: {
            profileId: string;
            providerId: RuntimeProviderId;
            flowId: string;
        },
        context?: LogContext
    ): Promise<AuthExecutionResult<PollAuthResult>> {
        const providerCheck = await ensureProviderExists(input.providerId);
        if (providerCheck.isErr()) {
            return errAuthExecution(providerCheck.error.code, providerCheck.error.message);
        }
        const result = await pollAuthFlow(input);
        if (result.isErr()) {
            appLog.warn({
                tag: 'provider.auth',
                message: 'Failed to poll provider auth flow.',
                profileId: input.profileId,
                providerId: input.providerId,
                flowId: input.flowId,
                code: result.error.code,
                error: result.error.message,
                ...withLogContext(context),
            });
            return errAuthExecution(result.error.code, result.error.message);
        }

        return okAuthExecution(result.value);
    }

    async completeAuth(
        input: {
            profileId: string;
            providerId: RuntimeProviderId;
            flowId: string;
            code?: string;
        },
        context?: LogContext
    ): Promise<AuthExecutionResult<PollAuthResult>> {
        const providerCheck = await ensureProviderExists(input.providerId);
        if (providerCheck.isErr()) {
            return errAuthExecution(providerCheck.error.code, providerCheck.error.message);
        }
        const result = await completeAuthFlow(input);
        if (result.isErr()) {
            appLog.warn({
                tag: 'provider.auth',
                message: 'Failed to complete provider auth flow.',
                profileId: input.profileId,
                providerId: input.providerId,
                flowId: input.flowId,
                code: result.error.code,
                error: result.error.message,
                ...withLogContext(context),
            });
            return errAuthExecution(result.error.code, result.error.message);
        }

        appLog.info({
            tag: 'provider.auth',
            message: 'Completed provider auth flow.',
            profileId: input.profileId,
            providerId: input.providerId,
            flowId: input.flowId,
            authState: result.value.state.authState,
            ...withLogContext(context),
        });

        return okAuthExecution(result.value);
    }

    async cancelAuth(
        input: {
            profileId: string;
            providerId: RuntimeProviderId;
            flowId: string;
        },
        context?: LogContext
    ): Promise<AuthExecutionResult<PollAuthResult>> {
        const providerCheck = await ensureProviderExists(input.providerId);
        if (providerCheck.isErr()) {
            return errAuthExecution(providerCheck.error.code, providerCheck.error.message);
        }
        const result = await cancelAuthFlow(input);
        if (result.isErr()) {
            appLog.warn({
                tag: 'provider.auth',
                message: 'Failed to cancel provider auth flow.',
                profileId: input.profileId,
                providerId: input.providerId,
                flowId: input.flowId,
                code: result.error.code,
                error: result.error.message,
                ...withLogContext(context),
            });
            return errAuthExecution(result.error.code, result.error.message);
        }

        appLog.info({
            tag: 'provider.auth',
            message: 'Cancelled provider auth flow.',
            profileId: input.profileId,
            providerId: input.providerId,
            flowId: input.flowId,
            ...withLogContext(context),
        });

        return okAuthExecution(result.value);
    }

    async refreshAuth(
        profileId: string,
        providerId: RuntimeProviderId,
        context?: LogContext
    ): Promise<AuthExecutionResult<ProviderAuthStateRecord>> {
        const providerCheck = await ensureProviderExists(providerId);
        if (providerCheck.isErr()) {
            return errAuthExecution(providerCheck.error.code, providerCheck.error.message);
        }
        if (providerId !== 'openai') {
            const errorCode = 'refresh_not_supported';
            const errorMessage = 'Refresh auth is currently supported only for openai.';
            appLog.warn({
                tag: 'provider.auth',
                message: errorMessage,
                profileId,
                providerId,
                code: errorCode,
                ...withLogContext(context),
            });
            return errAuthExecution(errorCode, errorMessage);
        }

        const lockKey = `${profileId}:${providerId}`;
        const inFlight = this.refreshLocks.get(lockKey);
        if (inFlight) {
            return inFlight;
        }

        const refreshPromise = (async (): Promise<AuthExecutionResult<ProviderAuthStateRecord>> => {
            const refreshToken = await readSecretValue(profileId, providerId, 'refresh_token');
            if (!refreshToken) {
                return errAuthExecution('refresh_token_missing', 'No refresh token configured for provider.');
            }

            const tokenResult = await refreshOpenAIToken(refreshToken);
            if (tokenResult.isErr()) {
                return errAuthExecution(tokenResult.error.code, tokenResult.error.message);
            }
            const token = tokenResult.value;
            const state = await persistAuthenticatedState({
                profileId,
                providerId,
                authMethod: 'oauth_pkce',
                accessToken: token.accessToken,
                refreshToken: token.refreshToken ?? refreshToken,
                ...(token.expiresAt ? { tokenExpiresAt: token.expiresAt } : {}),
                ...(token.accountId ? { accountId: token.accountId } : {}),
            });
            return okAuthExecution(state);
        })();

        this.refreshLocks.set(lockKey, refreshPromise);
        try {
            const result = await refreshPromise;
            if (result.isErr()) {
                appLog.warn({
                    tag: 'provider.auth',
                    message: 'Failed to refresh provider auth token.',
                    profileId,
                    providerId,
                    code: result.error.code,
                    error: result.error.message,
                    ...withLogContext(context),
                });
                return errAuthExecution(result.error.code, result.error.message);
            }

            appLog.info({
                tag: 'provider.auth',
                message: 'Refreshed provider auth token.',
                profileId,
                providerId,
                authState: result.value.authState,
                ...withLogContext(context),
            });
            return okAuthExecution(result.value);
        } finally {
            this.refreshLocks.delete(lockKey);
        }
    }

    async getAccountContext(
        profileId: string,
        providerId: RuntimeProviderId
    ): Promise<AuthExecutionResult<ProviderAccountContextResult>> {
        const providerCheck = await ensureProviderExists(providerId);
        if (providerCheck.isErr()) {
            return errAuthExecution(providerCheck.error.code, providerCheck.error.message);
        }

        return okAuthExecution(await getAccountContext(profileId, providerId));
    }

    async setOrganization(
        profileId: string,
        providerId: 'kilo',
        organizationId?: string | null
    ): Promise<AuthExecutionResult<ProviderAccountContextResult>> {
        const providerCheck = await ensureProviderExists(providerId);
        if (providerCheck.isErr()) {
            return errAuthExecution(providerCheck.error.code, providerCheck.error.message);
        }

        return okAuthExecution(await setOrganizationContext(profileId, providerId, organizationId));
    }
}

export const providerAuthExecutionService = new ProviderAuthExecutionService();
