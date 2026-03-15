import { createFincode } from "@fincode/node";

let _fincode: ReturnType<typeof createFincode> | null = null;

export function getFincode() {
    if (!_fincode) {
        if (!process.env.FINCODE_SECRET_KEY) {
            throw new Error('FINCODE_SECRET_KEY is not set');
        }
        _fincode = createFincode({
            apiKey: process.env.FINCODE_SECRET_KEY,
            isLiveMode: process.env.FINCODE_IS_LIVE === 'true',
        });
    }
    return _fincode;
}

export const fincode = new Proxy({} as ReturnType<typeof createFincode>, {
    get(_target, prop) {
        return (getFincode() as unknown as Record<string | symbol, unknown>)[prop];
    },
});
