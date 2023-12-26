import { IFilterBase } from 'src/common/interfaces';

export type IPaymentMethodSettingCreateBody = {
  name: string;
};

export type IPaymentMethodSettingUpdateBody =
  Partial<IPaymentMethodSettingCreateBody>;

export type IPaymentMethodFilter = IFilterBase;
