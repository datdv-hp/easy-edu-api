import { IFilterBase } from '@/common/interfaces';
import { TimekeepingStatus } from './timekeeping.constant';

export interface ITimekeepingCreateFormData {
  userId: string;
  lessonId: string;
  isAttended: boolean;
}

export interface ITimekeepingUpdateFormData {
  isAttended: boolean;
}

export interface ITimekeepingFilter extends IFilterBase {
  userIds?: string[];
  date?: string;
}
export interface IFilterListTeacher extends IFilterBase {
  userIds?: string[];
  startDate: string;
  endDate: string;
}
export interface IFilterListTeacherTimekeeping {
  startDate: string;
  endDate: string;
}

export interface ITimekeeping {
  id: string;
  name: string;
  course: string;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  code: string;
  classroom: {
    name: string;
    id: string;
  };
  timekeeping: {
    checkInDate: string;
    id: string;
    status: TimekeepingStatus;
  };
}
