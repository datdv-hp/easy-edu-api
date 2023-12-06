import { IFilterBase } from '@/common/interfaces';
import { AbsentRequestStatus, LessonStatus } from '@/database/constants';

export interface ILessonTime {
  randomString?: string;
  startTime: string;
  endTime: string;
  date: string;
}

export interface ILessonCreateForm {
  name: string;
  room?: string;
  isUseGoogleMeet?: boolean;
  classroomId: string;
  subjectId?: string;
  teacherId: string;
  times: ILessonTime[];
  documents?: string[];
  recordings?: string[];
  studentIds?: string[];
  lectureIds?: string[];
  syllabusId?: string;
  googleConfig?: { code: string; redirectUri: string };
}

export type ILessonUpdateForm = {
  name?: string;
  room?: string;
  teacherId?: string;
  studentIds?: string[];
  date?: string;
  startTime?: string;
  endTime?: string;
  documents?: string[];
  recordings?: string[];
  isUseGoogleMeet?: boolean;
  googleConfig?: { code: string; redirectUri: string };
  lectureIds?: string[];
  syllabusId?: string;
};

export interface ILessonFilter extends IFilterBase {
  courseIds?: string[];
  classroomIds?: string[];
  subjectIds?: string[];
  statuses?: LessonStatus[];
}

export interface ILessonScheduleQuery {
  classroomIds?: string[];
  teacherIds?: string[];
  subjectIds?: string[];
  startDate: string;
  endDate: string;
}

export interface ILessonScheduleForTeacherQuery {
  classroomIds?: string[];
  subjectIds?: string[];
  startDate: string;
  endDate: string;
}

export interface IHandleLessonAbsentForm {
  status: AbsentRequestStatus;
}

export interface ILessonAbsentCreateForm {
  lessonId: string;
  reason: string;
}
