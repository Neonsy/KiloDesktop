import { initLogger, log } from 'evlog';

type ScriptLogMethod = {
    (tag: string, message: string): void;
    (event: Record<string, unknown>): void;
};

let initialized = false;

function isEnabled(): boolean {
    return process.env['EVLOG_ENABLED'] !== '0';
}

function resolveEnvironment(): string {
    return process.env['NODE_ENV']?.trim() || 'development';
}

function ensureInitialized(): void {
    if (initialized || !isEnabled()) {
        return;
    }

    initLogger({
        env: {
            service: 'neon-conductor-scripts',
            environment: resolveEnvironment(),
            version: process.env['npm_package_version']?.trim() || '0.0.0',
        },
        pretty: process.env['EVLOG_PRETTY'] !== '0',
        stringify: true,
    });
    initialized = true;
}

function createScriptLogMethod(level: 'info' | 'warn' | 'error' | 'debug'): ScriptLogMethod {
    function scriptLogMethod(tag: string, message: string): void;
    function scriptLogMethod(event: Record<string, unknown>): void;
    function scriptLogMethod(...args: [string, string] | [Record<string, unknown>]): void {
        if (!isEnabled()) {
            return;
        }

        ensureInitialized();
        const target = log[level];
        if (args.length === 2) {
            target(args[0], args[1]);
            return;
        }

        target(args[0]);
    }

    return scriptLogMethod;
}

export const scriptLog = {
    info: createScriptLogMethod('info'),
    warn: createScriptLogMethod('warn'),
    error: createScriptLogMethod('error'),
    debug: createScriptLogMethod('debug'),
};
