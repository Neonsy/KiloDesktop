export function resolveElectronChildEnv(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    const electronChildEnv: NodeJS.ProcessEnv = { ...baseEnv };
    delete electronChildEnv.ELECTRON_RUN_AS_NODE;
    return electronChildEnv;
}
