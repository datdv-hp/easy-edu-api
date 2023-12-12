export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';

export enum Language {
  EN = 'en',
  VI = 'vi',
}
export enum DefaultOrderBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}
export enum OrderDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export const DEFAULT_LANGUAGE = Language.EN;
export const TIMEZONE_HEADER = 'x-timezone';
export const TIMEZONE_NAME_HEADER = 'x-timezone-name';

export const DEFAULT_LIMIT_FOR_DROPDOWN = 1000;
export const DEFAULT_LIMIT_FOR_PAGINATION = 10;
export const DEFAULT_FIRST_PAGE = 1;
export const DEFAULT_ORDER_BY = 'createdAt';
export const DEFAULT_ORDER_DIRECTION = 'desc';
export const DEFAULT_MIN_DATE = '1970-01-01 00:00:00';
export const DEFAULT_MAX_DATE = '3000-01-01 00:00:00';

export const MIN_ID = 1;
export const MIN_PAGE_LIMIT = 1; // min item per one page
export const MIN_PAGE_VALUE = 1; // min page value
export const MAX_PAGE_LIMIT = 10000; // max item per one page
export const MAX_PAGE_VALUE = 10000; // max page value

export const MEMO_MAX_LENGTH = 10000;
export const INPUT_TEXT_MAX_LENGTH = 255;
export const TEXTAREA_MAX_LENGTH = 2000;
export const ARRAY_MAX_LENGTH = 500;
export const TIME_MAX_LENGTH = 999;

export const Regex = {
  EMAIL: /^[\w+-\.]+@([\w-]+\.)+[\w-]{1,255}$/,
  PASSWORD: /^(?=.*[a-zA-z])(?=.*\d).{8,255}$/,
  PHONE: /^(?:\+84|0)(?:\d){9,10}$/,
  COLOR: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  DOCUMENT: /[^[\]\\|'";:/?.>,<)(_=+!@#$%^&*`~-]/,
};

export enum DateFormat {
  YYYY_MM_DD_HYPHEN = 'YYYY-MM-DD',
  YYYY_MM_DD_HH_HYPHEN = 'YYYY-MM-DD-HH',
  YYYYMMDD = 'YYYYMMDD',
  HH_mm_ss_COLON = 'HH:mm:ss',
  YYYY_MM_DD_HYPHEN_HH_mm_ss_COLON = 'YYYY-MM-DD HH:mm:ss',
  YYYY_MM_DD_HYPHEN_HH_mm_COLON = 'YYYY-MM-DD HH:mm',
  HH_mm_COLON = 'HH:mm',
  TIMEZONE = 'YYYY-MM-DDTHH:mm:ssZ',
  YYYY_MM_DD_HYPHEN_HH_mm_ss_COLON_SSS_DOT = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]',
}

export enum MongoCollection {
  USERS = 'users',
  USER_TOKENS = 'user_tokens',
  ROLES = 'roles',
  SUBJECTS = 'subjects',
  USER_VERIFIES = 'user_verifies',
  USER_COURSES = 'user_courses',
  COURSES = 'courses',
  CLASSROOMS = 'classrooms',
  SYLLABUS = 'syllabus',
  LESSONS = 'lessons',
  LECTURES = 'lectures',
  EVALUATION_CRITERIA_SETTINGS = 'evaluation_criteria_settings',
  SYLLABUS_HISTORY_EDITS = 'syllabus_history_edits',
  LESSON_ABSENTS = 'lesson_absents',
  TIMEKEEPINGS = 'timekeepings',
  GENERAL_SETTINGS = 'general_settings',
  REGISTRATIONS = 'registrations',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum UserStatus {
  ACTIVE = 'active',
  CONFIRMING = 'confirming',
  INVITE_EXPIRED = 'invite_expired',
}

export enum UserType {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  NONE = 'NONE',
}

export enum UserRole {
  USER = 'USER',
  MANAGER = 'MANAGER',
  MASTER = 'MASTER',
}

export enum RoleType {
  MASTER = 'MASTER',
  MANAGER = 'MANAGER',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export enum TokenType {
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  ACCESS_TOKEN = 'ACCESS_TOKEN',
}

export enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  NOT_SUPPORTED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  GROUP_HAS_CHILDREN = 410,
  GROUP_MAX_QUANTITY = 412,
  ITEM_NOT_FOUND = 444,
  ITEM_ALREADY_EXIST = 445,
  ITEM_INVALID = 446,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export const CODE_PADDING_LENGTH = 4;
