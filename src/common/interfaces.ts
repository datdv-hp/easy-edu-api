import { SortOrder } from 'mongoose';
import { RoleType } from './constants';

export interface IUserCredential {
  id: string;
  email: string;
  hashToken?: string;
}
export interface IContext {
  user?: IUserCredential;
  lang?: string;
  refreshToken?: string;
  roleType?: RoleType;
  permissions: Record<string, unknown>;
}

export interface IFilterBase {
  page: number;
  limit: number;
  skip: number;
  orderBy?: string;
  orderDirection?: SortOrder;
  keyword?: string;
}
