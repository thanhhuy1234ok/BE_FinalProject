import aqp from 'api-query-params';
import { ILike } from 'typeorm';
import type { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

export interface AqpConfigV2 {
  currentPage?: number; // page hiện tại
  limit?: number; // pageSize FE gửi
  defaultLimit?: number; // limit mặc định nếu FE không gửi

  // Các field text trong bảng chính để search bằng ILike
  textSearchFields?: string[];

  // Các field filter exact (=) trong bảng chính
  exactFields?: string[];

  // Search ILike theo relation
  relationILike?: Record<
    string,
    {
      relation: string; // tên relation trong entity (vd: 'role')
      field: string; // tên field trong relation (vd: 'name')
    }
  >;

  // Bỏ qua các filter FE gửi nhưng mình không dùng
  ignoreFilters?: string[];

  // Sort mặc định
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
      // hỗ trợ multi value (?a=1&a=2)
      if (k in obj) obj[k] = Array.isArray(obj[k]) ? [...obj[k], v] : [obj[k], v];
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

/**
 * Helper build where/order/offset/limit dùng lại cho nhiều module
 *
 * FIXES:
 * - aqp không giữ "name=2023" trong parsed.filter => lấy filter từ raw query
 * - sort hỗ trợ: sort=createdAt / sort=-createdAt / sort[createdAt]=1
 * - text search hỗ trợ multi-token AND: "fall 2023"
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

  // 0) Lấy raw query (có đủ name=2023, current=1, pageSize=10...)
  const raw = parseRawQuery(qs);

  // aqp dùng để parse sort chuẩn, và cũng ok nếu sau này FE gửi filter[name]
  const parsed = aqp(raw);

  // 1) Build filter từ raw (đừng dựa parsed.filter vì nó có thể rỗng)
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

  const pageLimit = limit ?? defaultLimit;
  const offset = (currentPage - 1) * pageLimit;

  // 2) Build where theo kiểu AND tokens:
  //    TypeORM FindOptionsWhere không diễn tả AND nhiều điều kiện cho cùng field tốt,
  //    nên ta dùng trick: tạo array where[] => (cond1) OR (cond2)...
  //    và để AND tokens, ta nhân các nhánh lên (cartesian) bằng cách "expand".
  let where: Array<Record<string, unknown>> = [filter];

  // helper: AND thêm điều kiện vào tất cả nhánh hiện có
  const andIntoAllBranches = (cond: Record<string, unknown>) => {
    where = where.map((branch) => ({ ...branch, ...cond }));
  };

  // helper: AND tokens cho 1 field trong root (name, ...)
  const andTokensForRootField = (field: string, rawVal: string) => {
    const tokens = splitTokens(rawVal);
    if (!tokens.length) return;

    // mỗi token là 1 điều kiện ILike, tất cả token phải đúng => AND
    for (const t of tokens) {
      andIntoAllBranches({ [field]: ILike(`%${t}%`) });
    }
  };

  // helper: AND tokens cho relation field
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

  // 3) Text search root fields (name=fall 2023)
  for (const field of textSearchFields) {
    const v = filter[field];
    if (typeof v === 'string' && v.trim() !== '') {
      andTokensForRootField(field, v);
      delete filter[field]; // quan trọng: tránh bị xóa ở bước exactFields
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

  // 5) Chỉ giữ lại exactFields trong filterCommon
  for (const k of Object.keys(filter)) {
    if (!exactFields.includes(k)) delete filter[k];
  }

  // Vì where đang tham chiếu filter object ban đầu,
  // đảm bảo các nhánh where có exactFields còn lại:
  where = where.map((branch) => ({ ...branch, ...filter }));

  // Nếu sau cùng where có đúng 1 nhánh rỗng => cho {} luôn
  const finalWhere: FindOptionsWhere<T> | FindOptionsWhere<T>[] =
    where.length <= 1 ? (where[0] as FindOptionsWhere<T>) : (where as any);

  // 6) Build order
  let order: FindOptionsOrder<T> = defaultSort as FindOptionsOrder<T>;

  // parsed.sort có thể là object (createdAt:1) hoặc string nếu lib/adapter khác
  const parsedSort = (parsed as any).sort;

  if (typeof parsedSort === 'string' && parsedSort.trim() !== '') {
    // sort=createdAt or sort=-createdAt
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
