import { IFilterBase } from '@/common/interfaces';
import { TuitionStatus } from './tuition.constant';

export interface IFilterTuitionList extends IFilterBase {
  classroomIds?: string[];
  statuses?: TuitionStatus[];
  startAt?: Date;
  endAt?: Date;
  presenterIds?: string[];
}

export type IFilterTuitionPaymentHistory = IFilterBase;

export type ITuitionPromotionInfo = {
  id: string;
  priority: number;
};

export type IUpdateTuitionInfoBody = {
  payment?: {
    startDate: Date;
    endDate: Date;
  };
  promotions?: ITuitionPromotionInfo[];
};

export type ITuitionPaymentBody = {
  paymentDate: Date;
  paymentMethodId: string;
  value: number;
};
