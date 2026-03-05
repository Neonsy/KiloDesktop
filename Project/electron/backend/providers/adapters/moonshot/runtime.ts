import { streamOpenAICompatibleRuntime } from '@/app/backend/providers/adapters/openaiCompatible/runtime';
import { resolveEndpointProfile } from '@/app/backend/providers/service/endpointProfiles';
import type {
    ProviderAdapterResult,
    ProviderRuntimeHandlers,
    ProviderRuntimeInput,
} from '@/app/backend/providers/types';

const MOONSHOT_STANDARD_BASE_URL =
    process.env['MOONSHOT_STANDARD_API_BASE_URL']?.trim() || 'https://api.moonshot.cn/v1';
const MOONSHOT_CODING_BASE_URL = process.env['MOONSHOT_CODING_BASE_URL']?.trim() || 'https://api.kimi.com/coding/v1';

function buildEndpoint(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalizedBase}${path}`;
}

async function resolveMoonshotEndpoints(profileId: string) {
    const endpointProfileResult = await resolveEndpointProfile(profileId, 'moonshot');
    const endpointProfile = endpointProfileResult.isErr() ? 'standard_api' : endpointProfileResult.value;
    const baseUrl = endpointProfile === 'coding_plan' ? MOONSHOT_CODING_BASE_URL : MOONSHOT_STANDARD_BASE_URL;
    return {
        chatCompletionsUrl: buildEndpoint(baseUrl, '/chat/completions'),
        responsesUrl: buildEndpoint(baseUrl, '/responses'),
    };
}

export async function streamMoonshotRuntime(
    input: ProviderRuntimeInput,
    handlers: ProviderRuntimeHandlers
): Promise<ProviderAdapterResult<void>> {
    return streamOpenAICompatibleRuntime(input, handlers, {
        providerId: 'moonshot',
        modelPrefix: 'moonshot/',
        label: 'Moonshot',
        resolveEndpoints: () => resolveMoonshotEndpoints(input.profileId),
    });
}
