import aqp from 'api-query-params';
import { ILike } from 'typeorm';
import type { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

export interface AqpConfigV2 {
    currentPage?: number;
    limit?: number;
    defaultLimit?: number;

    textSearchFields?: string[];
    exactFields?: string[];

    relationILike?: Record<
        string,
        {
            relation: string;
            field: string;
        }
    >;

    ignoreFilters?: string[];
    defaultSort?: Record<string, 'ASC' | 'DESC'>;
}

export interface AqpBuiltResultV2<T> {
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
    order: FindOptionsOrder<T>;
    offset: number;
    limit: number;
}

/** Parse query: hỗ trợ string "a=1&b=2" và object req.query */
function parseRawQuery(qs: string | Record<string, any> | undefined | null) {
    if (!qs) return {} as Record<string, any>;

    if (typeof qs === 'string') {
        const sp = new URLSearchParams(qs.startsWith('?') ? qs.slice(1) : qs);
        const obj: Record<string, any> = {};
        sp.forEach((v, k) => {
            if (k in obj)
                obj[k] = Array.isArray(obj[k]) ? [...obj[k], v] : [obj[k], v];
            else obj[k] = v;
        });
        return obj;
    }

    return qs;
}

/** split "fall 2023" -> ["fall","2023"] */
function splitTokens(v: string) {
    return v
        .trim()
        .split(/\s+/)
        .map((x) => x.trim())
        .filter(Boolean);
}

/** Lấy value “đúng” từ query: nếu là array -> lấy phần tử đầu */
function pickFirst(v: unknown) {
    return Array.isArray(v) ? v[0] : v;
}

/** Convert string query value -> boolean/number/null khi phù hợp */
function coerceScalar(v: unknown) {
    const x = pickFirst(v);

    if (x === undefined) return undefined;

    if (x === null) return null;

    if (typeof x === 'boolean' || typeof x === 'number') return x;

    if (typeof x !== 'string') return x;

    const s = x.trim();

    if (s === '') return s;

    // null
    if (s.toLowerCase() === 'null') return null;

    // boolean
    if (s.toLowerCase() === 'true') return true;
    if (s.toLowerCase() === 'false') return false;

    // number (cẩn thận: chỉ convert khi là số hợp lệ)
    // cho phép "0", "10", "-5", "3.14"
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        if (!Number.isNaN(n)) return n;
    }

    return s;
}

/**
 * Helper build where/order/offset/limit
 */
export function buildAqpQueryOptions<T>(
    qs: string | Record<string, any>,
    config: AqpConfigV2,
): AqpBuiltResultV2<T> {
    const {
        currentPage = 1,
        limit,
        defaultLimit = 10,
        textSearchFields = [],
        exactFields = [],
        relationILike = {},
        ignoreFilters = ['current', 'pageSize'],
        defaultSort = {},
    } = config;

    const raw = parseRawQuery(qs);
    const parsed = aqp(raw);

    // 1) filter từ raw
    const filter: Record<string, unknown> = { ...raw };

    // reserved keys không phải filter
    const reserved = new Set([
        'sort',
        'filter',
        'projection',
        'population',
        'skip',
        'limit',
        'page',
    ]);

    for (const k of Object.keys(filter)) {
        if (reserved.has(k)) delete filter[k];
    }
    for (const k of ignoreFilters) {
        if (k in filter) delete filter[k];
    }

    // 1.1) Coerce giá trị cho exact fields (đặc biệt boolean như isActive)
    // Chỉ convert những field có trong exactFields (để tránh convert text search bừa)
    for (const k of Object.keys(filter)) {
        if (exactFields.includes(k)) {
            filter[k] = coerceScalar(filter[k]);
        } else {
            // vẫn nên “pickFirst” để tránh array phá logic search
            filter[k] = pickFirst(filter[k]);
        }
    }

    const pageLimit = limit ?? defaultLimit;
    const offset = (currentPage - 1) * pageLimit;

    // 2) where branches
    let where: Array<Record<string, unknown>> = [filter];

    const andIntoAllBranches = (cond: Record<string, unknown>) => {
        where = where.map((branch) => ({ ...branch, ...cond }));
    };

    const andTokensForRootField = (field: string, rawVal: string) => {
        const tokens = splitTokens(rawVal);
        if (!tokens.length) return;

        for (const t of tokens) {
            andIntoAllBranches({ [field]: ILike(`%${t}%`) });
        }
    };

    const andTokensForRelationField = (
        relation: string,
        relField: string,
        rawVal: string,
    ) => {
        const tokens = splitTokens(rawVal);
        if (!tokens.length) return;

        for (const t of tokens) {
            andIntoAllBranches({
                [relation]: {
                    [relField]: ILike(`%${t}%`),
                },
            });
        }
    };

    // 3) Text search root fields
    for (const field of textSearchFields) {
        const v = filter[field];

        // ✅ chỉ cho phép string vào ILike
        if (typeof v === 'string' && v.trim() !== '') {
            andTokensForRootField(field, v);
            delete filter[field]; // tránh bị bước exactFields xóa
        }
    }

    // 4) Text search relation fields
    for (const filterKey of Object.keys(relationILike)) {
        const cfg = relationILike[filterKey];
        const v = filter[filterKey];

        if (typeof v === 'string' && v.trim() !== '') {
            andTokensForRelationField(cfg.relation, cfg.field, v);
            delete filter[filterKey];
        }
    }

    // 5) chỉ giữ exactFields
    for (const k of Object.keys(filter)) {
        if (!exactFields.includes(k)) delete filter[k];
    }

    // merge exactFields vào các branch
    where = where.map((branch) => ({ ...branch, ...filter }));

    const finalWhere: FindOptionsWhere<T> | FindOptionsWhere<T>[] =
        where.length <= 1 ? (where[0] as FindOptionsWhere<T>) : (where as any);

    // 6) order
    let order: FindOptionsOrder<T> = defaultSort as FindOptionsOrder<T>;
    const parsedSort = (parsed as any).sort;

    if (typeof parsedSort === 'string' && parsedSort.trim() !== '') {
        const s = parsedSort.trim();
        const desc = s.startsWith('-');
        const sortBy = desc ? s.slice(1) : s;
        order = { [sortBy]: desc ? 'DESC' : 'ASC' } as any;
    } else {
        const sortObj = (parsed.sort ?? {}) as Record<string, unknown>;
        const entries = Object.entries(sortObj);
        if (entries.length > 0) {
            const [sortBy, sortOrderRaw] = entries[0];
            const sortOrder =
                sortOrderRaw === 1 || sortOrderRaw === '1' ? 'ASC' : 'DESC';
            order = { [sortBy]: sortOrder } as any;
        }
    }

    return {
        where: finalWhere,
        order,
        offset,
        limit: pageLimit,
    };
}
