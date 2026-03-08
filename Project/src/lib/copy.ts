export async function copyText(value: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            return false;
        }
    }

    return false;
}
