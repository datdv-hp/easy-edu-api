import { IFilterBase } from '@/common/interfaces';
import { Types } from 'mongoose';

export type ICourseCreateFormData = {
  name: string;
  description?: string;
  subjectIds?: string[];
  courseFormIds?: string[];
  times: number;
  tuition: number;
};

export type ICourseUpdateFormData = Partial<ICourseCreateFormData>;

export interface ICourseFilter extends IFilterBase {
  courseFormIds?: Types.ObjectId[];
}
