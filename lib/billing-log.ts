type BillingLogLevel = 'info' | 'warn' | 'error';

type BillingLogDetails = Record<string, unknown>;

function emitLog(level: BillingLogLevel, event: string, details: BillingLogDetails = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        scope: 'billing',
        event,
        env: process.env.NODE_ENV,
        ...details,
    };

    const serialized = JSON.stringify(payload);

    if (level === 'error') {
        console.error(serialized);
        return;
    }

    if (level === 'warn') {
        console.warn(serialized);
        return;
    }

    console.log(serialized);
}

function serializeError(error: unknown): BillingLogDetails {
    if (error instanceof Error) {
        return {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
        };
    }

    return {
        errorMessage: String(error),
    };
}

export function createBillingRequestId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now()}-${random}`;
}

export function maskIdentifier(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    if (value.length <= 8) {
        return value;
    }

    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string | null {
    if (!email) {
        return null;
    }

    const [localPart, domainPart] = email.split('@');
    if (!localPart || !domainPart) {
        return email;
    }

    const visibleLocal = localPart.slice(0, 2);
    return `${visibleLocal}***@${domainPart}`;
}

export function logBillingInfo(event: string, details: BillingLogDetails = {}) {
    emitLog('info', event, details);
}

export function logBillingWarn(event: string, details: BillingLogDetails = {}) {
    emitLog('warn', event, details);
}

export function logBillingError(event: string, error: unknown, details: BillingLogDetails = {}) {
    emitLog('error', event, {
        ...details,
        ...serializeError(error),
    });
}
