export enum StudentDegree {
  ELEMENTARY = 'ELEMENTARY',
  SECONDARY_SCHOOL = 'SECONDARY_SCHOOL',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  COLLEGE = 'COLLEGE',
  OTHER = 'OTHER',
}

export const CodePrefix = {
  TEACHER: 'TE',
  STUDENT: 'ST',
  SUBJECT: 'SU',
  COURSE: 'CS',
  CLASSROOM: 'CL',
  LESSON: 'LS',
};

export enum UserVerifyType {
  ACTIVE_ACCOUNT = 'active_account',
  FORGOT_PASSWORD = 'forgot_password',
}

export enum ClassroomStatus {
  OPENING = 'opening',
  COMING = 'coming',
  FINISHED = 'finished',
}

export enum MimeType {
  PDF = 'application/pdf',
  VIDEO_MP4 = 'video/mp4',
  WMV = 'video/x-ms-wmv',
  WMO = 'video/quicktime',
}

export enum EvaluationCriteriaStatus {
  FOLLOWING = 'FOLLOWING',
  UN_FOLLOWING = 'UN_FOLLOWING',
}

export enum CriteriaType {
  FORMULA = 'FORMULA',
  LIST = 'LIST',
}

export const DELETE_COND = {
  $or: [
    { deletedAt: null },
    { deletedAt: { $exists: false } },
    { deleted: false },
  ],
};

export enum LessonStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
}
export enum AbsentRequestStatus {
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  UNAPPROVED = 'UNAPPROVED',
}

export enum SettingType {
  TIMEKEEPING = 'TIMEKEEPING',
  COURSE_FORM = 'COURSE_FORM',
}

export enum TimeKeepingType {
  CUTOFF_DATE = 'CUTOFF_DATE',
  END_OF_MONTH = 'END_OF_MONTH',
}
