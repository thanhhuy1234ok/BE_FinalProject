export function removeVietnameseTones(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

// tuỳ bạn mở rộng thêm
const STOP_WORDS = new Set([
    'khoa',
    'bo',
    'mon',
    'nganh',
    'chuyen',
    'nganh',
    'chuyennganh',
    'vien',
    'truong',
    'hoc',
    'dao',
    'tao',
    'va',
    'of',
    'and',
    'the',
    'department',
    'faculty',
]);

// ưu tiên map acronym “chuẩn” theo thói quen VN
const PREFERRED_ACRONYM: Record<string, string> = {
    'cong nghe thong tin': 'CNTT',
    'ky thuat phan mem': 'KTPM',
    'khoa hoc may tinh': 'KHMT',
    'he thong thong tin': 'HTTT',
    'an toan thong tin': 'ATTT',
    'tri tue nhan tao': 'TTNT',
    'khoa hoc du lieu': 'KHDL',
    'mang may tinh': 'MMT',
    'dien tu vien thong': 'DTVT',
    'tu dong hoa': 'TDH',
    'quan tri kinh doanh': 'QTKD',
    'ke toan': 'KT',
    'tai chinh ngan hang': 'TCNH',
    marketing: 'MKT',
};

export type DeptCodeOptions = {
    maxLen?: number; // độ dài code cuối (default 6)
    keepNumbers?: boolean; // giữ số (default true)
    existingCodes?: string[]; // để tránh trùng
};

function normalizeNameForKey(name: string) {
    return removeVietnameseTones(name)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(name: string) {
    const clean = removeVietnameseTones(name)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!clean) return [];

    // tách từ, bỏ stopwords
    return clean
        .split(' ')
        .filter(Boolean)
        .filter((w) => !STOP_WORDS.has(w));
}

function buildAcronym(words: string[], keepNumbers: boolean) {
    if (words.length === 0) return '';

    // lấy chữ cái đầu mỗi từ, số thì giữ nếu cho phép
    const chars: string[] = [];
    for (const w of words) {
        if (!w) continue;

        const first = w[0];
        if (/[0-9]/.test(first)) {
            if (keepNumbers) chars.push(first);
            continue;
        }
        if (/[a-z]/.test(first)) chars.push(first.toUpperCase());
    }
    return chars.join('');
}

function buildSingleWordCode(word: string, maxLen: number) {
    // nếu là 1 từ: lấy 4-6 ký tự đầu (tuỳ maxLen)
    const len = Math.min(Math.max(4, Math.floor(maxLen)), word.length);
    return word.substring(0, len).toUpperCase();
}

function makeUnique(base: string, existingCodes?: string[]) {
    if (!existingCodes || existingCodes.length === 0) return base;
    const set = new Set(existingCodes.map((c) => c.toUpperCase()));
    if (!set.has(base)) return base;

    // thêm hậu tố 2 chữ số: IT01, IT02...
    for (let i = 1; i <= 99; i++) {
        const suffix = String(i).padStart(2, '0');
        const candidate = `${base}${suffix}`;
        if (!set.has(candidate)) return candidate;
    }
    return `${base}${Date.now().toString().slice(-2)}`; // fallback
}

/**
 * Model tạo mã bộ môn thông minh
 */
export function generateDeptSmartCode(
    name: string,
    options: DeptCodeOptions = {},
): string {
    const { maxLen = 6, keepNumbers = true, existingCodes } = options;

    const key = normalizeNameForKey(name);
    if (!key) return '';

    // 1) ưu tiên acronym “chuẩn” nếu match
    const preferred = PREFERRED_ACRONYM[key];
    if (preferred)
        return makeUnique(preferred.substring(0, maxLen), existingCodes);

    const words = tokenize(name);

    // 2) nếu nhiều từ: acronym (CNTT/IT/...)
    if (words.length > 1) {
        let code = buildAcronym(words, keepNumbers);

        // acronym quá dài -> cắt
        if (code.length > maxLen) code = code.substring(0, maxLen);

        // acronym quá ngắn (vd chỉ 1-2 ký tự) -> bù bằng 1-2 ký tự từ cuối
        if (code.length < Math.min(3, maxLen)) {
            const last = words[words.length - 1] ?? '';
            const extra = last.substring(
                1,
                1 + (Math.min(3, maxLen) - code.length),
            );
            code = (code + extra).toUpperCase();
        }

        return makeUnique(code, existingCodes);
    }

    // 3) nếu còn 1 từ: lấy 4-6 ký tự đầu
    const one = words[0] ?? key.split(' ')[0];
    const code = buildSingleWordCode(one, maxLen);
    return makeUnique(code, existingCodes);
}
