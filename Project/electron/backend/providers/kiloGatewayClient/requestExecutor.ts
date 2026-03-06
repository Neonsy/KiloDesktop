import { err, ok, type Result } from 'neverthrow';

import {
    DEFAULT_CLIENT_VERSION,
    DEFAULT_EDITOR_NAME,
    HEADER_EDITOR_NAME,
    HEADER_MODE,
    HEADER_ORGANIZATION_ID,
} from '@/app/backend/providers/kiloGatewayClient/constants';
import { appLog } from '@/app/main/logging';

export type GatewayErrorCategory = 'auth' | 'rate_limit' | 'upstream' | 'schema' | 'network';

export interface GatewayErrorShape {
    code: 'timeout' | 'http_error' | 'schema_error' | 'network_error';
    category: GatewayErrorCategory;
    message: string;
    endpoint: string;
    statusCode?: number;
}

export type GatewayRequestResult = Result<ExecuteRequestOutput, GatewayErrorShape>;

export class KiloGatewayError extends Error {
    readonly category: GatewayErrorCategory;
    readonly statusCode: number | undefined;
    readonly endpoint: string;

    constructor(input: { message: string; category: GatewayErrorCategory; endpoint: string; statusCode?: number }) {
        super(input.message);
        this.name = 'KiloGatewayError';
        this.category = input.category;
        this.endpoint = input.endpoint;
        this.statusCode = input.statusCode;
    }
}

export interface RequestHeadersInput {
    accessToken?: string;
    organizationId?: string;
    mode?: string;
}

export interface ExecuteRequestInput {
    endpoint: string;
    method?: 'GET' | 'POST';
    timeoutMs: number;
    headers?: RequestHeadersInput;
    body?: unknown;
}

export interface ExecuteRequestOutput {
    payload: Record<string, unknown>;
    statusCode: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildHeaders(input?: RequestHeadersInput): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'neonconductor-gateway-client',
        [HEADER_EDITOR_NAME]: DEFAULT_EDITOR_NAME,
        'X-NeonConductor-Client-Version': DEFAULT_CLIENT_VERSION,
    };

    if (input?.accessToken) {
        headers['Authorization'] = `Bearer ${input.accessToken}`;
    }

    if (input?.organizationId) {
        headers[HEADER_ORGANIZATION_ID] = input.organizationId;
    }

    if (input?.mode) {
        headers[HEADER_MODE] = input.mode;
    }

    return headers;
}

function mapStatusToCategory(statusCode: number): GatewayErrorCategory {
    if (statusCode === 401 || statusCode === 403) {
        return 'auth';
    }

    if (statusCode === 429) {
        return 'rate_limit';
    }

    if (statusCode >= 500) {
        return 'upstream';
    }

    return 'upstream';
}

export async function executeJsonRequest(input: ExecuteRequestInput): Promise<GatewayRequestResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, input.timeoutMs);

    appLog.debug({
        tag: 'provider.kilo-gateway',
        message: 'Starting gateway request.',
        endpoint: input.endpoint,
        method: input.method ?? 'GET',
        timeoutMs: input.timeoutMs,
    });

    try {
        const requestInit: RequestInit = {
            method: input.method ?? 'GET',
            headers: buildHeaders(input.headers),
            signal: controller.signal,
            ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
        };
        const response = await fetch(input.endpoint, requestInit);

        if (!response.ok) {
            const error: GatewayErrorShape = {
                code: 'http_error',
                message: `Gateway request failed: ${response.status.toString()} ${response.statusText}`,
                category: mapStatusToCategory(response.status),
                endpoint: input.endpoint,
                statusCode: response.status,
            };
            appLog.warn({
                tag: 'provider.kilo-gateway',
                message: 'Gateway request failed with non-2xx response.',
                endpoint: input.endpoint,
                method: input.method ?? 'GET',
                statusCode: response.status,
                category: error.category,
                latencyMs: Date.now() - startedAt,
            });
            return err(error);
        }

        try {
            const payload: unknown = await response.json();
            if (!isRecord(payload)) {
                const parseError: GatewayErrorShape = {
                    code: 'schema_error',
                    message: 'Gateway response payload must be a JSON object.',
                    category: 'schema',
                    endpoint: input.endpoint,
                    statusCode: response.status,
                };
                appLog.warn({
                    tag: 'provider.kilo-gateway',
                    message: 'Gateway response payload shape is invalid.',
                    endpoint: input.endpoint,
                    method: input.method ?? 'GET',
                    statusCode: response.status,
                    latencyMs: Date.now() - startedAt,
                });
                return err(parseError);
            }
            const output: ExecuteRequestOutput = {
                payload,
                statusCode: response.status,
            };
            appLog.info({
                tag: 'provider.kilo-gateway',
                message: 'Gateway request completed.',
                endpoint: input.endpoint,
                method: input.method ?? 'GET',
                statusCode: response.status,
                latencyMs: Date.now() - startedAt,
            });
            return ok(output);
        } catch (error) {
            const parseError: GatewayErrorShape = {
                code: 'schema_error',
                message: error instanceof Error ? error.message : 'Failed to parse JSON payload.',
                category: 'schema',
                endpoint: input.endpoint,
                statusCode: response.status,
            };
            appLog.warn({
                tag: 'provider.kilo-gateway',
                message: 'Gateway response JSON parse failed.',
                endpoint: input.endpoint,
                method: input.method ?? 'GET',
                statusCode: response.status,
                latencyMs: Date.now() - startedAt,
                error: parseError.message,
            });
            return err(parseError);
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            const timeoutError: GatewayErrorShape = {
                code: 'timeout',
                message: `Gateway request timed out after ${input.timeoutMs.toString()}ms.`,
                category: 'network',
                endpoint: input.endpoint,
            };
            appLog.warn({
                tag: 'provider.kilo-gateway',
                message: 'Gateway request timed out.',
                endpoint: input.endpoint,
                method: input.method ?? 'GET',
                timeoutMs: input.timeoutMs,
            });
            return err(timeoutError);
        }

        const networkError: GatewayErrorShape = {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Network request failed.',
            category: 'network',
            endpoint: input.endpoint,
        };
        appLog.warn({
            tag: 'provider.kilo-gateway',
            message: 'Gateway network request failed.',
            endpoint: input.endpoint,
            method: input.method ?? 'GET',
            latencyMs: Date.now() - startedAt,
            error: networkError.message,
        });
        return err(networkError);
    } finally {
        clearTimeout(timeout);
    }
}
