import { initLogger, log } from 'evlog';

import { flushLogDrain, getLogDrain } from '@/app/main/logging/fileDrain';

export interface InitAppLoggerOptions {
    isDev: boolean;
    version: string;
}

let appLoggerEnabled = false;

type AppLogMethod = {
    (tag: string, message: string): void;
    (event: Record<string, unknown>): void;
};

function resolveEnvironment(isDev: boolean): string {
    return process.env['NODE_ENV'] ?? (isDev ? 'development' : 'production');
}

function resolveEnabled(isDev: boolean): boolean {
    if (!isDev) {
        return false;
    }

    return process.env['EVLOG_ENABLED'] !== '0';
}

function resolvePretty(isDev: boolean): boolean {
    const prettyOverride = process.env['EVLOG_PRETTY'];

    if (prettyOverride === '1') {
        return true;
    }

    if (prettyOverride === '0') {
        return false;
    }

    return isDev;
}

function createAppLogMethod(level: 'info' | 'warn' | 'error' | 'debug'): AppLogMethod {
    function appLogMethod(tag: string, message: string): void;
    function appLogMethod(event: Record<string, unknown>): void;
    function appLogMethod(...args: [string, string] | [Record<string, unknown>]): void {
        if (!appLoggerEnabled) {
            return;
        }

        const target = log[level];
        if (args.length === 2) {
            target(args[0], args[1]);
            return;
        }

        target(args[0]);
    }

    return appLogMethod;
}

export const appLog = {
    info: createAppLogMethod('info'),
    warn: createAppLogMethod('warn'),
    error: createAppLogMethod('error'),
    debug: createAppLogMethod('debug'),
};

export function isAppLoggerEnabled(): boolean {
    return appLoggerEnabled;
}

export function initAppLogger(options: InitAppLoggerOptions): void {
    const { isDev, version } = options;
    appLoggerEnabled = resolveEnabled(isDev);

    if (!appLoggerEnabled) {
        return;
    }

    const pretty = resolvePretty(isDev);

    initLogger({
        env: {
            service: 'neon-conductor-main',
            environment: resolveEnvironment(isDev),
            version,
        },
        pretty,
        stringify: true,
        drain: getLogDrain(),
    });

    appLog.info('logging', `evlog initialized (pretty=${pretty ? 'on' : 'off'})`);
}

export async function flushAppLogger(): Promise<void> {
    if (!appLoggerEnabled) {
        return;
    }

    try {
        await flushLogDrain();
    } catch (error) {
        appLog.error({
            tag: 'logging',
            message: 'Failed to flush evlog drain before exit.',
            ...(error instanceof Error ? { error: error.message } : { error: String(error) }),
        });
    }
}
