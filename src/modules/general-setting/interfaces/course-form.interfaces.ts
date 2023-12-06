import { IFilterBase } from '@/common/interfaces';
export interface ICourseFormCreateFormData {
  name: string;
}

export type ICourseFormUpdateFormData = ICourseFormCreateFormData;

export type IFilterCourseForm = IFilterBase;

export interface BulkDeletePaymentMethodBody {
  ids: string[];
}
