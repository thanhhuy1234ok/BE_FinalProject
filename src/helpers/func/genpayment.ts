import * as crypto from 'crypto';
import * as qs from 'qs';

const DUE_DAYS = 3;

export const generatePaymentCode = () => {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');

    return `PAY-${ymd}-${Date.now()}-${rand}`;
};

export const buildDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + DUE_DAYS);
    return d;
};

export function finalIpNormalize(ip: string) {
    if (!ip || ip === '::1') return '127.0.0.1';

    if (ip.startsWith('::ffff:')) {
        return ip.replace('::ffff:', '');
    }

    return ip;
}

export function sortObject(obj: Record<string, string>) {
    const sorted: Record<string, string> = {};

    Object.keys(obj)
        .sort()
        .forEach((key) => {
            sorted[key] = obj[key];
        });

    return sorted;
}

export function createVnpaySecureHash(
    params: Record<string, string>,
    secretKey: string,
) {
    const signData = qs.stringify(params, {
        encode: true,
    });

    return crypto
        .createHmac('sha512', secretKey)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');
}

export const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(Number(value));
};
