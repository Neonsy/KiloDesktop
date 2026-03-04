import { err, ok, type Result } from 'neverthrow';

export const firstPartyProviderIds = ['kilo', 'openai'] as const;

export type FirstPartyProviderId = (typeof firstPartyProviderIds)[number];
export interface UnsupportedProviderIdError {
    code: 'provider_not_supported';
    message: string;
}

export type SupportedProviderIdResult = Result<FirstPartyProviderId, UnsupportedProviderIdError>;

export function isSupportedProviderId(providerId: string): providerId is FirstPartyProviderId {
    return (firstPartyProviderIds as readonly string[]).includes(providerId);
}

export function toSupportedProviderIdResult(providerId: string): SupportedProviderIdResult {
    if (!isSupportedProviderId(providerId)) {
        return err({
            code: 'provider_not_supported',
            message: `Unsupported provider: "${providerId}".`,
        });
    }

    return ok(providerId);
}

export function parseSupportedProviderId(providerId: string): SupportedProviderIdResult {
    return toSupportedProviderIdResult(providerId);
}

export function assertSupportedProviderId(providerId: string): FirstPartyProviderId {
    const result = toSupportedProviderIdResult(providerId);
    if (result.isErr()) {
        throw new Error(result.error.message);
    }

    return result.value;
}
