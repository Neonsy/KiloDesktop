import { streamOpenAICompatibleRuntime } from '@/app/backend/providers/adapters/openaiCompatible/runtime';
import type {
    ProviderAdapterResult,
    ProviderRuntimeHandlers,
    ProviderRuntimeInput,
} from '@/app/backend/providers/types';

const OPENAI_CHAT_COMPLETIONS_ENDPOINT =
    process.env['OPENAI_CHAT_COMPLETIONS_ENDPOINT']?.trim() || 'https://api.openai.com/v1/chat/completions';
const OPENAI_RESPONSES_ENDPOINT =
    process.env['OPENAI_RESPONSES_ENDPOINT']?.trim() || 'https://api.openai.com/v1/responses';

export async function streamOpenAIRuntime(
    input: ProviderRuntimeInput,
    handlers: ProviderRuntimeHandlers
): Promise<ProviderAdapterResult<void>> {
    return streamOpenAICompatibleRuntime(input, handlers, {
        providerId: 'openai',
        modelPrefix: 'openai/',
        label: 'OpenAI',
        resolveEndpoints: () => ({
            chatCompletionsUrl: OPENAI_CHAT_COMPLETIONS_ENDPOINT,
            responsesUrl: OPENAI_RESPONSES_ENDPOINT,
        }),
    });
}
