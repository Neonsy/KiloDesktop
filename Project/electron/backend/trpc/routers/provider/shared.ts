import type { OperationalErrorCode } from '@/app/backend/runtime/services/common/operationalError';
import { raiseTrpcError } from '@/app/backend/trpc/trpcErrorMap';

const providerOperationalCodes = [
    'auth_missing',
    'flow_not_found',
    'invalid_payload',
    'provider_auth_invalid_state',
    'provider_auth_unsupported',
    'provider_not_authenticated',
    'provider_not_registered',
    'provider_not_supported',
    'provider_request_failed',
    'provider_request_unavailable',
    'provider_secret_missing',
    'refresh_token_missing',
    'request_failed',
    'request_unavailable',
] as const;

function isProviderOperationalCode(code: string): code is OperationalErrorCode {
    return providerOperationalCodes.some((candidate) => candidate === code);
}

export function throwWithCode(code: OperationalErrorCode, message: string): never {
    return raiseTrpcError({ code, message });
}

export function mapAuthErrorToOperationalCode(code: string): OperationalErrorCode {
    if (code === 'method_not_supported' || code === 'method_not_implemented' || code === 'refresh_not_supported') {
        return 'provider_auth_unsupported';
    }
    if (code === 'pkce_code_required') {
        return 'invalid_payload';
    }

    return isProviderOperationalCode(code) ? code : 'request_failed';
}

export function isProviderNotFoundCode(code: string): boolean {
    return code === 'provider_not_supported' || code === 'provider_not_registered';
}
