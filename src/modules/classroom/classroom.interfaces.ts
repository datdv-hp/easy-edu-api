import { IFilterBase } from '@/common/interfaces';

export type IClassroomCreateFormData = {
  name: string;
  courseId: string;
  startDate: string;
  endDate: string;
  participantIds: string[];
  color?: string;
  teachers?: string[];
  syllabusIds?: string[];
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
