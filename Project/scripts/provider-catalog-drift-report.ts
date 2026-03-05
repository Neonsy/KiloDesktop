import { listStaticModelDefinitions } from '@/app/backend/providers/metadata/staticCatalog/registry';

interface DriftReportEntry {
    providerId: 'openai' | 'zai' | 'moonshot';
    endpointProfile: string;
    endpoint: string;
    status: 'ok' | 'skipped' | 'error';
    reason?: string;
    staticOnly: string[];
    liveOnly: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeUpstreamModelId(providerId: DriftReportEntry['providerId'], modelId: string): string {
    const prefix = `${providerId}/`;
    return modelId.startsWith(prefix) ? modelId.slice(prefix.length) : modelId;
}

async function fetchLiveModels(endpoint: string, apiKey: string): Promise<string[]> {
    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
        return [];
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload)) {
        return [];
    }

    const data = Array.isArray(payload['data']) ? payload['data'] : [];
    return data
        .map((item) => (isRecord(item) ? item['id'] : undefined))
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

function createDiff(staticModels: string[], liveModels: string[]): { staticOnly: string[]; liveOnly: string[] } {
    const staticSet = new Set(staticModels);
    const liveSet = new Set(liveModels);

    const staticOnly = Array.from(staticSet)
        .filter((modelId) => !liveSet.has(modelId))
        .sort((a, b) => a.localeCompare(b));
    const liveOnly = Array.from(liveSet)
        .filter((modelId) => !staticSet.has(modelId))
        .sort((a, b) => a.localeCompare(b));

    return { staticOnly, liveOnly };
}

async function run(): Promise<void> {
    const reports: DriftReportEntry[] = [];

    const checks: Array<{
        providerId: DriftReportEntry['providerId'];
        endpointProfile: string;
        endpoint: string;
        apiKeyEnv: string;
    }> = [
        {
            providerId: 'openai',
            endpointProfile: 'default',
            endpoint: process.env['OPENAI_MODELS_ENDPOINT']?.trim() || 'https://api.openai.com/v1/models',
            apiKeyEnv: 'OPENAI_API_KEY',
        },
        {
            providerId: 'zai',
            endpointProfile: 'coding_international',
            endpoint: `${(process.env['ZAI_CODING_BASE_URL']?.trim() || 'https://api.z.ai/api/coding/paas/v4').replace(/\/$/, '')}/models`,
            apiKeyEnv: 'ZAI_API_KEY',
        },
        {
            providerId: 'zai',
            endpointProfile: 'general_international',
            endpoint: `${(process.env['ZAI_GENERAL_BASE_URL']?.trim() || 'https://api.z.ai/api/paas/v4').replace(/\/$/, '')}/models`,
            apiKeyEnv: 'ZAI_API_KEY',
        },
        {
            providerId: 'moonshot',
            endpointProfile: 'standard_api',
            endpoint: `${(process.env['MOONSHOT_STANDARD_API_BASE_URL']?.trim() || 'https://api.moonshot.cn/v1').replace(/\/$/, '')}/models`,
            apiKeyEnv: 'MOONSHOT_API_KEY',
        },
        {
            providerId: 'moonshot',
            endpointProfile: 'coding_plan',
            endpoint: `${(process.env['MOONSHOT_CODING_BASE_URL']?.trim() || 'https://api.kimi.com/coding/v1').replace(/\/$/, '')}/models`,
            apiKeyEnv: 'MOONSHOT_API_KEY',
        },
    ];

    for (const check of checks) {
        const apiKey = process.env[check.apiKeyEnv]?.trim();
        if (!apiKey) {
            reports.push({
                providerId: check.providerId,
                endpointProfile: check.endpointProfile,
                endpoint: check.endpoint,
                status: 'skipped',
                reason: `Missing ${check.apiKeyEnv}`,
                staticOnly: [],
                liveOnly: [],
            });
            continue;
        }

        const staticDefinitions = listStaticModelDefinitions(check.providerId, check.endpointProfile);
        const staticModels = staticDefinitions.map((definition) =>
            normalizeUpstreamModelId(check.providerId, definition.modelId)
        );

        const liveModels = await fetchLiveModels(check.endpoint, apiKey);
        const diff = createDiff(staticModels, liveModels);
        reports.push({
            providerId: check.providerId,
            endpointProfile: check.endpointProfile,
            endpoint: check.endpoint,
            status: 'ok',
            staticOnly: diff.staticOnly,
            liveOnly: diff.liveOnly,
        });
    }

    process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)}\n`);
}

void run();
