import { Gender, UserType } from '@/common/constants';
import { IFilterBase } from '@/common/interfaces';
import { StudentDegree } from '@/database/constants';

export type IUserFormDataBase = {
  name: string;
  email: string;
  dob: string;
  phone: string;
  avatar?: string;
  gender: Gender;
  roleId: string;
};

export type IUserUpdateFormDataBase = Partial<IUserFormDataBase>;

export interface ICreateUserFormData {
  firstName: string;
  lastName?: string;
  avatar?: string;
  username?: string;
  email: string;
  dob?: Date;
  phone?: string;
  gender?: Gender;
}

export type IUpdateProfileFormData = Partial<
  Omit<ICreateUserFormData, 'email' | 'phone'> & {
    teacherDetail?: {
      degree?: string;
      workUnit?: string;
      note?: string;
    };
    type: UserType;
  }
>;

// TEACHER
export interface ITeacherFilter extends IFilterBase {
  subjectIds?: string[];
}

export interface ITeacherDetail {
  subjectIds?: string[];
  degree?: string;
  workUnit?: string;
  signedContractDate?: string;
  note?: string;
  nationality?: string;
  identity?: string;
}

export interface ITeacherCreateFormData extends IUserFormDataBase {
  teacherDetail: ITeacherDetail;
}

export interface ITeacherUpdateFormData extends IUserUpdateFormDataBase {
  teacherDetail?: ITeacherDetail;
}

export type ITeacherFilterClassroom = IFilterBase;

// MANAGER

export interface IManagerFilter extends IFilterBase {
  subjectIds?: string[];
  isTeacher?: boolean;
}

export interface IManagerDetail {
  signedContractDate?: string;
}

export type IManagerCreateFormData = IUserFormDataBase & {
  managerDetail: IManagerDetail;
  teacherDetail?: ITeacherDetail;
  isTeacher: boolean;
};

export type IManagerUpdateFormData = Partial<IManagerCreateFormData>;

// STUDENT

export interface IStudentFilter extends IFilterBase {
  courseIds?: string[];
}
export interface IStudentClassroomFilter extends IFilterBase {
  status: string;
}
interface ICourseDetail {
  courseId: string;
  subjectIds?: string[];
  presenterId: string;
}

interface IStudentDetail {
  degree: StudentDegree;
  courses: ICourseDetail[];
}

export interface IStudentCreateFormData extends IUserFormDataBase {
  studentDetail?: IStudentDetail;
  registrationId?: string;
}

export interface IStudentUpdateFormData extends IUserUpdateFormDataBase {
  studentDetail?: IStudentDetail;
  updateCourseData?: Record<
    string,
    { subjectIds: string[]; presenterId: string }
  >;
  removeCourseIds: string[];
}

export interface IActiveAccountFormData {
  code: string;
  email: string;
}
