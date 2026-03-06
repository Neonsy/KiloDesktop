export function throwWithCode(code: string, message: string): never {
    const error = new Error(message);
    Object.assign(error, { code });
    throw error;
}

export function mapAuthErrorToOperationalCode(code: string): string {
    if (code === 'method_not_supported' || code === 'method_not_implemented' || code === 'refresh_not_supported') {
        return 'provider_auth_unsupported';
    }
    if (code === 'pkce_code_required') {
        return 'invalid_payload';
    }

    return code;
}

export function isProviderNotFoundCode(code: string): boolean {
    return code === 'provider_not_supported' || code === 'provider_not_registered';
}
