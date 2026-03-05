import { streamOpenAICompatibleRuntime } from '@/app/backend/providers/adapters/openaiCompatible/runtime';
import { resolveEndpointProfile } from '@/app/backend/providers/service/endpointProfiles';
import type {
    ProviderAdapterResult,
    ProviderRuntimeHandlers,
    ProviderRuntimeInput,
} from '@/app/backend/providers/types';

const ZAI_CODING_BASE_URL = process.env['ZAI_CODING_BASE_URL']?.trim() || 'https://api.z.ai/api/coding/paas/v4';
const ZAI_GENERAL_BASE_URL = process.env['ZAI_GENERAL_BASE_URL']?.trim() || 'https://api.z.ai/api/paas/v4';

function buildEndpoint(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalizedBase}${path}`;
}

async function resolveZaiEndpoints(profileId: string) {
    const endpointProfileResult = await resolveEndpointProfile(profileId, 'zai');
    const endpointProfile = endpointProfileResult.isErr() ? 'coding_international' : endpointProfileResult.value;
    const baseUrl = endpointProfile === 'general_international' ? ZAI_GENERAL_BASE_URL : ZAI_CODING_BASE_URL;
    return {
        chatCompletionsUrl: buildEndpoint(baseUrl, '/chat/completions'),
        responsesUrl: buildEndpoint(baseUrl, '/responses'),
    };
}

export async function streamZaiRuntime(
    input: ProviderRuntimeInput,
    handlers: ProviderRuntimeHandlers
): Promise<ProviderAdapterResult<void>> {
    return streamOpenAICompatibleRuntime(input, handlers, {
        providerId: 'zai',
        modelPrefix: 'zai/',
        label: 'Z.AI',
        resolveEndpoints: () => resolveZaiEndpoints(input.profileId),
    });
}
