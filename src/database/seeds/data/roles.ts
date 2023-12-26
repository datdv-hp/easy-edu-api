import { RoleType } from '../../../common/constants';

export const features = {
  user: {
    update: true,
    changePassword: true,
  },
  registration: {
    view: true,
    createStudent: true,
    delete: true,
  },
  role: {
    view: true,
    create: true,
    update: true,
    delete: true,
  },
  manager: {
    view: true,
    create: true,
    update: true,
    delete: true,
  },
  teacher: {
    view: true,
    viewClassroomByTeacher: true,
    create: true,
    update: true,
    delete: true,
  },
  student: {
    view: true,
    viewClassroomByStudent: true,
    create: true,
    update: true,
    delete: true,
  },
  schedule: {
    view: true,
    viewPersonal: true,
    createRequestLeave: true,
    deleteLeaveRequest: true,
    createLesson: true,
    updateLesson: true,
    attendance: true,
    updateTimeKeeping: true,
    delete: true,
  },
  subject: {
    view: true,
    create: true,
    update: true,
    delete: true,
  },
  course: {
    view: true,
    viewPersonal: true,
    viewClassroomByCourse: true,
    viewPersonalClassroomByCourse: true,
    viewSubjectByCourse: true,
    viewTeacherByCourse: true,
    detailBasic: true,
    detailStatistics: true,
    create: true,
    update: true,
    delete: true,
  },
  classroom: {
    view: true,
    viewPersonal: true,
    viewSyllabus: true,
    viewTimeKeeping: true,
    viewAttendance: true,
    viewStudentClassroom: true,
    viewGeneralClassroom: true,
    detailBasic: true,
    detailStatistics: true,
    create: true,
    update: true,
    delete: true,
    download: true,
  },
  lesson: {
    view: true,
    viewPersonal: true,
    create: true,
    update: true,
    delete: true,
    updateDocument: true,
    // downloadVideo: true,
  },
  timekeeping: {
    view: true,
    viewPersonal: true,
    create: true,
  },
  syllabus: {
    view: true,
    viewPersonal: true,
    create: true,
    update: true,
    delete: true,
    download: true,
  },
  courseFormSetting: {
    view: true,
    create: true,
    update: true,
    delete: true,
  },
  settingTimekeeping: {
    view: true,
    update: true,
  },
  promotionSetting: {
    view: true,
    create: true,
    update: true,
    delete: true,
  },
  paymentMethodSetting: {
    view: true,
    create: true,
    update: true,
    delete: true,
  },
  tuition: {
    update: true,
    view: true,
    viewPersonal: true,
  },
};

export const masterRole = {
  ...features,
  user: {
    changePassword: true,
  },
  schedule: {
    view: true,
    createLesson: true,
    updateLesson: true,
    attendance: true,
    updateTimeKeeping: true,
    delete: true,
  },
};

export const managerRole = {
  ...features,
  course: {
    view: true,
    viewClassroomByCourse: true,
    viewSubjectByCourse: true,
    viewTeacherByCourse: true,
    detailBasic: true,
    detailStatistics: true,
    create: true,
    update: true,
    delete: true,
  },
  classroom: {
    view: true,
    viewSyllabus: true,
    detailBasic: true,
    detailStatistics: true,
    viewTimeKeeping: true,
    viewAttendance: true,
    viewStudentClassroom: true,
    viewGeneralClassroom: true,
    create: true,
    update: true,
    delete: true,
    download: true,
  },
  lesson: {
    view: true,
    create: true,
    update: true,
    delete: true,
    updateDocument: true,
    // downloadVideo: true,
  },
  schedule: {
    view: true,
    createLesson: true,
    updateLesson: true,
    attendance: true,
    updateTimeKeeping: true,
    delete: true,
  },
  timekeeping: {
    view: true,
    create: true,
  },
  syllabus: {
    view: true,
    create: true,
    update: true,
    delete: true,
    download: true,
  },
  tuition: {
    view: true,
    update: true,
  },
};

export const teacherRole = {
  user: {
    update: true,
    changePassword: true,
  },
  schedule: {
    viewPersonal: true,
    attendance: true,
    updateTimeKeeping: true,
  },
  course: {
    viewPersonal: true,
    detailBasic: true,
    viewPersonalClassroomByCourse: true,
    viewSubjectByCourse: true,
    viewTeacherByCourse: true,
  },
  classroom: {
    viewPersonal: true,
    viewAttendance: true,
    viewSyllabus: true,
    viewStudentClassroom: true,
    viewGeneralClassroom: true,
    detailBasic: true,
    detailStatistics: true,
  },
  lesson: {
    viewPersonal: true,
    updateDocument: true,
  },
  timekeeping: {
    viewPersonal: true,
  },
  syllabus: {
    viewPersonal: true,
  },
};

export const studentRole = {
  user: {
    update: true,
    changePassword: true,
  },
  schedule: {
    viewPersonal: true,
    createRequestLeave: true,
    deleteLeaveRequest: true,
  },
  course: {
    viewPersonal: true,
    viewPersonalClassroomByCourse: true,
    viewSubjectByCourse: true,
    viewTeacherByCourse: true,
    detailBasic: true,
  },
  classroom: {
    viewPersonal: true,
    viewAttendance: true,
    viewStudentClassroom: true,
    viewSyllabus: true,
    viewGeneralClassroom: true,
    detailBasic: true,
  },
  lesson: {
    viewPersonal: true,
  },
  syllabus: {
    viewPersonal: true,
  },
  tuition: {
    viewPersonal: true,
  },
};

export const roleDefaultData = [
  {
    name: RoleType.MASTER,
    type: RoleType.MASTER,
    features: JSON.stringify(masterRole),
    isMaster: true,
    isDefault: true,
  },
  {
    name: RoleType.MANAGER,
    type: RoleType.MANAGER,
    features: JSON.stringify(managerRole),
    isDefault: true,
  },
  {
    name: RoleType.TEACHER,
    type: RoleType.TEACHER,
    features: JSON.stringify(teacherRole),
    isDefault: true,
  },
  {
    name: RoleType.STUDENT,
    type: RoleType.STUDENT,
    features: JSON.stringify(studentRole),
    isDefault: true,
  },
];

const defaultKeyManagerFeatures = Object.fromEntries(
  Object.keys(managerRole).map((key) => [key, Object.keys(managerRole[key])]),
);

const defaultKeyTeacherFeatures = Object.fromEntries(
  Object.keys(teacherRole).map((key) => [key, Object.keys(teacherRole[key])]),
);

const defaultKeyStudentFeatures = Object.fromEntries(
  Object.keys(studentRole).map((key) => [key, Object.keys(studentRole[key])]),
);

export const defaultKeyFeatures = [
  {
    type: RoleType.MANAGER,
    keys: defaultKeyManagerFeatures,
  },
  {
    type: RoleType.TEACHER,
    keys: defaultKeyTeacherFeatures,
  },
  {
    type: RoleType.STUDENT,
    keys: defaultKeyStudentFeatures,
  },
];
