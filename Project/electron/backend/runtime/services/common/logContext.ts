export interface CorrelationContext {
    requestId?: string | undefined;
    correlationId?: string | undefined;
}

export interface EventOriginContext extends CorrelationContext {
    origin?: string | undefined;
}

export function withCorrelationContext(
    context: CorrelationContext | undefined,
    fields?: Record<string, unknown>
): Record<string, unknown> {
    return {
        ...(fields ?? {}),
        ...(context?.requestId ? { requestId: context.requestId } : {}),
        ...(context?.correlationId ? { correlationId: context.correlationId } : {}),
    };
}

export function eventMetadata(context: EventOriginContext | undefined): Record<string, unknown> {
    return {
        ...(context?.requestId ? { requestId: context.requestId } : {}),
        ...(context?.correlationId ? { correlationId: context.correlationId } : {}),
        ...(context?.origin ? { origin: context.origin } : {}),
    };
}
