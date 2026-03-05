import { createOpenAICompatibleRuntimeBehavior } from '@/app/backend/providers/behaviors/openaiCompatible/runtime';

export const openAIRuntimeBehavior = createOpenAICompatibleRuntimeBehavior({
    providerId: 'openai',
    billedViaApiKey: 'openai_api',
    billedViaOAuth: 'openai_subscription',
});
