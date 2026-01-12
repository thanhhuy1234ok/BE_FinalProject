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

/**
 * Helper build where/order/offset/limit dùng lại cho nhiều module
 */
export function buildAqpQueryOptions<T>(
  qs: string,
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

  const parsed = aqp(qs || '');

  // aqp trả về kiểu lỏng -> ép kiểu an toàn
  const filter = (parsed.filter ?? {}) as Record<string, unknown>;
  const sort = (parsed.sort ?? {}) as Record<string, unknown>;

  // 1) Xoá filter dư (current, pageSize,...)
  for (const key of ignoreFilters) {
    if (key in filter) delete filter[key];
  }

  const pageLimit =
    Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;

  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : defaultLimit;

  const offset = (pageLimit - 1) * safeLimit;

  // 2) Tách filterCommon (exact) & OR conditions (ILike)
  const whereOr: Array<Record<string, unknown>> = [];

  // Text search cho field root
  for (const field of textSearchFields) {
    const v = filter[field];
    if (typeof v === 'string' && v.trim() !== '') {
      whereOr.push({ [field]: ILike(`%${v}%`) });
      delete filter[field];
    }
  }

  // Text search cho relation
  for (const filterKey of Object.keys(relationILike)) {
    const cfg = relationILike[filterKey];
    const v = filter[filterKey];

    if (typeof v === 'string' && v.trim() !== '') {
      whereOr.push({
        [cfg.relation]: {
          [cfg.field]: ILike(`%${v}%`),
        },
      });
      delete filter[filterKey];
    }
  }

  // 3) Chỉ giữ lại exactFields trong filterCommon
  for (const key of Object.keys(filter)) {
    if (!exactFields.includes(key)) delete filter[key];
  }

  // 4) Gộp where:
  // - Không có OR: where = filterCommon
  // - Có OR: (cond1 AND filterCommon) OR (cond2 AND filterCommon)
  let where: FindOptionsWhere<T> | FindOptionsWhere<T>[] =
    filter as FindOptionsWhere<T>;

  if (whereOr.length) {
    where = whereOr.map((cond) => ({
      ...(cond as object),
      ...(filter as object),
    })) as FindOptionsWhere<T> | FindOptionsWhere<T>[];
  }

  // 5) Build order
  let order: FindOptionsOrder<T> = defaultSort as FindOptionsOrder<T>;

  const sortEntries = Object.entries(sort);
  if (sortEntries.length > 0) {
    const [sortBy, sortOrderRaw] = sortEntries[0];

    // aqp thường cho 1 hoặc -1, nhưng để an toàn:
    const sortOrder =
      sortOrderRaw === 1 || sortOrderRaw === '1' ? 'ASC' : 'DESC';

    order = { [sortBy]: sortOrder } as FindOptionsOrder<T>;
  }

  return {
    where,
    order,
    offset,
    limit: pageLimit,
  };
}
