import { createOpenAICompatibleRuntimeBehavior } from '@/app/backend/providers/behaviors/openaiCompatible/runtime';

export const moonshotRuntimeBehavior = createOpenAICompatibleRuntimeBehavior({
    providerId: 'moonshot',
    billedViaApiKey: 'moonshot_api',
    billedViaOAuth: 'moonshot_api',
});
