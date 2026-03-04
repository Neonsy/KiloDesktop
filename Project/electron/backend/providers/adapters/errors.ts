import { err, ok, type Result } from 'neverthrow';

export type ProviderAdapterErrorCode =
    | 'auth_missing'
    | 'invalid_payload'
    | 'provider_request_failed'
    | 'provider_request_unavailable';

export interface ProviderAdapterError {
    code: ProviderAdapterErrorCode;
    message: string;
}

export type ProviderAdapterResult<T> = Result<T, ProviderAdapterError>;

export function okProviderAdapter<T>(value: T): ProviderAdapterResult<T> {
    return ok(value);
}

export function errProviderAdapter(code: ProviderAdapterErrorCode, message: string): ProviderAdapterResult<never> {
    return err({
        code,
        message,
    });
}

export function toProviderAdapterException(error: ProviderAdapterError): Error {
    const exception = new Error(error.message);
    (exception as { code?: string }).code = error.code;
    return exception;
}
