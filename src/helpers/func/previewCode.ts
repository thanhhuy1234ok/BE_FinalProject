import { BadRequestException } from "@nestjs/common";

export const normalizeMajorCode = (code: string) => {
    return code.trim().toUpperCase().replace(/\s+/g, '');
}

// year code: 2023 -> 23, 23 -> 23
export const toKCode = (yearOrCode: number | string) => {
    const raw = String(yearOrCode ?? '').trim();
    if (!raw) throw new BadRequestException('Year code is invalid');

    // Lấy tất cả chữ số trong chuỗi
    const digits = raw.replace(/\D/g, ''); // "K23" -> "23", "2023-2024" -> "20232024"
    if (!digits) throw new BadRequestException('Year code is invalid');

    // Nếu có 4 số (2023) hoặc nhiều số (20232024), lấy 2 số cuối của "năm bắt đầu"
    // ưu tiên lấy 4 số đầu tiên nếu có
    const first4 = digits.match(/\d{4}/)?.[0];
    if (first4) return first4.slice(2); // "2023" -> "23"

    // Nếu không có 4 số, lấy 2 số cuối cùng
    if (digits.length >= 2) return digits.slice(-2);

    throw new BadRequestException('Year code is invalid');
}
