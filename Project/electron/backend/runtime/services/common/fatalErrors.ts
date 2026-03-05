export class InvariantError extends Error {
    readonly code = 'invariant_violation' as const;

    constructor(message: string) {
        super(message);
        this.name = 'InvariantError';
    }
}

export class DataCorruptionError extends Error {
    readonly code = 'data_corruption' as const;

    constructor(message: string) {
        super(message);
        this.name = 'DataCorruptionError';
    }
}
