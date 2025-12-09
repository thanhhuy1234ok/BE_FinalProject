import aqp from 'api-query-params';
import { ILike } from 'typeorm';

export interface AqpConfigV2 {
  currentPage?: number; // page hiện tại
  limit?: number; // pageSize FE gửi
  defaultLimit?: number; // limit mặc định nếu FE không gửi

  // Các field text trong bảng chính để search bằng ILike
  // ví dụ: ['name', 'email']
  textSearchFields?: string[];

  // Các field filter exact (=) trong bảng chính
  // ví dụ: ['role_id', 'isActive']
  exactFields?: string[];

  // Search ILike theo relation
  // ví dụ: { role: { relation: 'role', field: 'name' } }
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

export interface AqpBuiltResultV2 {
  where: any;
  order: any;
  offset: number;
  limit: number;
}

/**
 * Helper build where/order/offset/limit dùng lại cho nhiều module
 */
export function buildAqpQueryOptions(
  qs: string,
  config: AqpConfigV2,
): AqpBuiltResultV2 {
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

  const { filter = {}, sort = {} } = aqp(qs || '');

  // 1. Xoá filter dư (current, pageSize,...)
  ignoreFilters.forEach((key) => {
    if (filter[key] !== undefined) {
      delete filter[key];
    }
  });

  const pageLimit = limit || defaultLimit;
  const offset = (currentPage - 1) * pageLimit;

  const whereCondition: any[] = [];

  // 2. Text search cho field root (name, email,...)
  for (const field of textSearchFields) {
    if (filter[field]) {
      whereCondition.push({ [field]: ILike(`%${filter[field]}%`) });
      delete filter[field]; // xoá để tránh trùng
    }
  }

  // 3. Text search cho relation (role, subjects,...)
  for (const filterKey of Object.keys(relationILike)) {
    const cfg = relationILike[filterKey]; // { relation: 'role', field: 'name' }
    if (filter[filterKey]) {
      whereCondition.push({
        [cfg.relation]: {
          [cfg.field]: ILike(`%${filter[filterKey]}%`),
        },
      });
      delete filter[filterKey];
    }
  }

  // 4. Lọc lại filter còn lại chỉ cho phép exactFields
  Object.keys(filter).forEach((key) => {
    if (!exactFields.includes(key)) {
      delete filter[key];
    }
  });

  // 5. Gộp where:
  // - Nếu có OR conditions (whereCondition.length > 0)
  //   -> mỗi condition sẽ AND với filter chung
  //   -> (cond1 AND filterCommon) OR (cond2 AND filterCommon)
  let where: any = filter;

  if (whereCondition.length) {
    where = whereCondition.map((cond) => ({
      ...cond,
      ...filter,
    }));
  }

  // 6. Build order
  let order: any = { ...defaultSort };

  const sortEntries = Object.entries(sort);
  if (sortEntries.length > 0) {
    const [sortBy, sortOrder] = sortEntries[0];
    order = { [sortBy]: sortOrder === 1 ? 'ASC' : 'DESC' };
  }

  return {
    where,
    order,
    offset,
    limit: pageLimit,
  };
}
