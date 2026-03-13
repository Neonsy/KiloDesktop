const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

export function normalizeOpenAIBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function trimOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function isOfficialOpenAIBaseUrl(baseUrl: string | null | undefined): boolean {
    const trimmed = trimOptional(baseUrl ?? undefined);
    if (!trimmed) {
        return false;
    }

    return normalizeOpenAIBaseUrl(trimmed) === DEFAULT_OPENAI_BASE_URL;
}

function deriveBaseUrlFromEndpoint(endpoint: string | undefined, suffix: string): string | null {
    const normalizedEndpoint = trimOptional(endpoint);
    if (!normalizedEndpoint || !normalizedEndpoint.endsWith(suffix)) {
        return null;
    }

    return normalizeOpenAIBaseUrl(normalizedEndpoint.slice(0, -suffix.length));
}

export function resolveOpenAIBaseUrl(): string {
    const explicitBaseUrl = trimOptional(process.env['OPENAI_BASE_URL']);
    if (explicitBaseUrl) {
        return normalizeOpenAIBaseUrl(explicitBaseUrl);
    }

    const chatDerivedBaseUrl = deriveBaseUrlFromEndpoint(
        process.env['OPENAI_CHAT_COMPLETIONS_ENDPOINT'],
        '/chat/completions'
    );
    const responsesDerivedBaseUrl = deriveBaseUrlFromEndpoint(process.env['OPENAI_RESPONSES_ENDPOINT'], '/responses');

    if (chatDerivedBaseUrl && responsesDerivedBaseUrl && chatDerivedBaseUrl === responsesDerivedBaseUrl) {
        return chatDerivedBaseUrl;
    }

    if (chatDerivedBaseUrl && !responsesDerivedBaseUrl) {
        return chatDerivedBaseUrl;
    }

    if (responsesDerivedBaseUrl && !chatDerivedBaseUrl) {
        return responsesDerivedBaseUrl;
    }

    return DEFAULT_OPENAI_BASE_URL;
}

export function resolveOpenAIEndpoints(): {
    chatCompletionsUrl: string;
    responsesUrl: string;
    baseUrl: string;
} {
    const baseUrl = resolveOpenAIBaseUrl();

    return {
        chatCompletionsUrl:
            trimOptional(process.env['OPENAI_CHAT_COMPLETIONS_ENDPOINT']) ?? `${baseUrl}/chat/completions`,
        responsesUrl: trimOptional(process.env['OPENAI_RESPONSES_ENDPOINT']) ?? `${baseUrl}/responses`,
        baseUrl,
    };
}

export function resolveOpenAIEndpointsFromBaseUrl(baseUrl: string): {
    chatCompletionsUrl: string;
    responsesUrl: string;
    baseUrl: string;
} {
    return {
        chatCompletionsUrl: `${normalizeOpenAIBaseUrl(baseUrl)}/chat/completions`,
        responsesUrl: `${normalizeOpenAIBaseUrl(baseUrl)}/responses`,
        baseUrl: normalizeOpenAIBaseUrl(baseUrl),
    };
}

export function buildOpenAIRealtimeWebSocketUrl(baseUrl: string, modelId: string): string {
    const normalizedBaseUrl = normalizeOpenAIBaseUrl(baseUrl);
    const websocketBaseUrl = normalizedBaseUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    return `${websocketBaseUrl}/realtime?model=${encodeURIComponent(modelId)}`;
}
