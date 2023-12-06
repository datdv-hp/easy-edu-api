import { IFilterBase } from 'src/common/interfaces';
import { RoleType } from '@/common/constants';

export interface IRoleCreateFormData {
  name: string;
  type: RoleType;
  features: object;
  description?: string;
}

export interface IRoleUpdateFormData {
  name?: string;
  features?: object;
  description?: string;
  type: RoleType;
}

export interface IUserRoleUpdateFormData {
  roleId: string;
}

export type IRoleFilter = IFilterBase;
