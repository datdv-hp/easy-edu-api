import { IFilterBase } from '@/common/interfaces';
import { PromotionType } from '@/database/constants';
import { PromotionStatus } from './promotion-setting.constant';

export type IPromotionSettingListFilter = IFilterBase & {
  courseIds?: string[];
  statuses?: PromotionStatus[];
};

export type IPromotionSettingCreateBody = {
  name: string;
  description?: string;
  info: {
    value: number;
    type: PromotionType;
  };
  applyForCourseIds: string[];
  times: number;
  startAt: Date;
  endAt: Date;
};

export type IPromotionSettingUpdateBody = Partial<IPromotionSettingCreateBody>;

export type IPromotionUtilizationListFilter = IFilterBase;
