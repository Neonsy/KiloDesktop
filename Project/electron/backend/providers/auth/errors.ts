import { err, ok, type Result } from 'neverthrow';

export type AuthExecutionErrorCode =
    | 'flow_not_found'
    | 'invalid_payload'
    | 'method_not_supported'
    | 'method_not_implemented'
    | 'pkce_code_required'
    | 'provider_request_failed'
    | 'provider_request_unavailable'
    | 'refresh_not_supported'
    | 'refresh_token_missing';

export interface AuthExecutionError {
    code: AuthExecutionErrorCode;
    message: string;
}

export type AuthExecutionResult<T> = Result<T, AuthExecutionError>;

export function okAuthExecution<T>(value: T): AuthExecutionResult<T> {
    return ok(value);
}

export function errAuthExecution(code: AuthExecutionErrorCode, message: string): AuthExecutionResult<never> {
    return err({
        code,
        message,
    });
}

export function toAuthExecutionException(error: AuthExecutionError): Error {
    const exception = new Error(error.message);
    (exception as { code?: string }).code = error.code;
    return exception;
}
