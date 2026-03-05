import { createOpenAICompatibleRuntimeBehavior } from '@/app/backend/providers/behaviors/openaiCompatible/runtime';

export const zaiRuntimeBehavior = createOpenAICompatibleRuntimeBehavior({
    providerId: 'zai',
    billedViaApiKey: 'zai_api',
    billedViaOAuth: 'zai_api',
});
