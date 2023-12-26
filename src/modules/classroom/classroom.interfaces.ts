import { IFilterBase } from '@/common/interfaces';
interface PaymentDate {
  startDate: Date;
  endDate: Date;
}
export type IClassroomCreateFormData = {
  name: string;
  courseId: string;
  startDate: string;
  endDate: string;
  participantIds: string[];
  color?: string;
  teachers?: string[];
  syllabusIds?: string[];
  paymentDate: PaymentDate;
};

export type IClassroomUpdateFormData = Partial<IClassroomCreateFormData>;

export interface IClassFilter extends IFilterBase {
  courseIds?: string[];
  statuses?: string[];
}
export type IClassroomSyllabusQuery = IFilterBase;
export interface IGetTotalStudent {
  classroomId: string;
  subjectId: string;
}
