import type { SqliteDatabase, SqliteStatement } from 'kysely';
import type { DatabaseSync, StatementSync } from 'node:sqlite';

type NodeSqliteInputValue = null | number | bigint | string | NodeJS.ArrayBufferView;

function toNodeSqliteParameter(value: unknown): NodeSqliteInputValue {
    if (
        value === null ||
        typeof value === 'number' ||
        typeof value === 'bigint' ||
        typeof value === 'string'
    ) {
        return value;
    }

    if (ArrayBuffer.isView(value)) {
        return value as NodeSqliteInputValue;
    }

    throw new Error(`Unsupported SQLite parameter type: ${typeof value}`);
}

function normalizeParameters(parameters: ReadonlyArray<unknown>): NodeSqliteInputValue[] {
    return parameters.map(toNodeSqliteParameter);
}

class NodeSqliteStatement implements SqliteStatement {
    readonly reader: boolean;

    constructor(private readonly statement: StatementSync) {
        this.reader = this.statement.columns().length > 0;
    }

    all(parameters: ReadonlyArray<unknown>): unknown[] {
        return this.statement.all(...normalizeParameters(parameters));
    }

    run(parameters: ReadonlyArray<unknown>): {
        changes: number | bigint;
        lastInsertRowid: number | bigint;
    } {
        return this.statement.run(...normalizeParameters(parameters));
    }

    iterate(parameters: ReadonlyArray<unknown>): IterableIterator<unknown> {
        return this.statement.iterate(...normalizeParameters(parameters)) as IterableIterator<unknown>;
    }
}

export class NodeSqliteDatabase implements SqliteDatabase {
    constructor(private readonly database: DatabaseSync) {}

    close(): void {
        try {
            this.database.close();
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code?: string }).code === 'ERR_INVALID_STATE'
            ) {
                return;
            }

            throw error;
        }
    }

    prepare(sql: string): SqliteStatement {
        return new NodeSqliteStatement(this.database.prepare(sql));
    }
}

export function createNodeSqliteDatabase(database: DatabaseSync): SqliteDatabase {
    return new NodeSqliteDatabase(database);
}
