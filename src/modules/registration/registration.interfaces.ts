import { IFilterBase } from '@/common/interfaces';
import { RegistrationStatus } from '@/database/constants';

export type ICreateRegistrationBody = {
  name: string;
  email: string;
  phone: string;
};

export type IRegistrationFilter = IFilterBase & {
  statuses?: RegistrationStatus[];
};
