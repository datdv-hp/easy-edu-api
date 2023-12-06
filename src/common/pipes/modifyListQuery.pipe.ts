import { PipeTransform, Injectable } from '@nestjs/common';
import { DEFAULT_LIMIT_FOR_PAGINATION, OrderDirection } from '../constants';

@Injectable()
export class ModifyFilterQueryPipe implements PipeTransform {
  constructor() {
    //
  }
  transform(query: Record<string, unknown>) {
    if (!query.page) {
      query.page = 1;
    }
    if (!query.limit) {
      query.limit = DEFAULT_LIMIT_FOR_PAGINATION;
    }
    Object.keys(query).forEach((key) => {
      if (query[key] === 'null') {
        query[key] = null;
      }
      if (query[key] === 'true') {
        query[key] = true;
      }
      if (query[key] === 'false') {
        query[key] = false;
      }
    });
    if (!query.orderBy) {
      query.orderBy = 'createdAt';
    }
    if (!query.orderDirection) {
      query.orderDirection = OrderDirection.DESC;
    }
    if (!query.keyword) {
      query.keyword = '';
    }
    return {
      ...(query as Record<string, unknown>),
      skip: (Number(query.page) - 1) * Number(query.limit),
      page: Number(query.page),
      limit: Number(query.limit),
    };
  }
}
