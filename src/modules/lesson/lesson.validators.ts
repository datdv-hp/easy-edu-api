import { INPUT_TEXT_MAX_LENGTH, MEMO_MAX_LENGTH } from '@/common/constants';
import { ObjectIdSchema, BaseFilterSchema } from '@/common/validations';
import { LessonStatus, AbsentRequestStatus } from '@/database/constants';
import Joi from '@/plugins/joi';

const name = Joi.string().max(INPUT_TEXT_MAX_LENGTH);
const room = Joi.string().max(INPUT_TEXT_MAX_LENGTH);
const classroom = ObjectIdSchema.allow(null);
const subject = ObjectIdSchema.allow(null);
const teacher = ObjectIdSchema.allow(null);
const date = Joi.date().format('YYYY-MM-DD');
const startTime = Joi.date().format('HH:mm');
const endTime = Joi.date().format('HH:mm');
const documents = Joi.array().items(Joi.string().max(INPUT_TEXT_MAX_LENGTH));
const time = Joi.object({
  date: date.required(),
  startTime: startTime.required(),
  endTime: endTime.min(Joi.ref('startTime')).required(),
});
const recordings = Joi.array().items(Joi.string().max(INPUT_TEXT_MAX_LENGTH));
const lectureIds = Joi.array().items(ObjectIdSchema);
const GoogleConfigSchema = Joi.object({
  code: Joi.string().max(INPUT_TEXT_MAX_LENGTH).required(),
  redirectUri: Joi.string().max(INPUT_TEXT_MAX_LENGTH).required(),
});

export const createLessonSchema = Joi.object({
  name: name.required(),
  room: room.optional(),
  classroomId: classroom.required(),
  subjectId: subject.optional(),
  teacherId: teacher.required(),
  times: Joi.array().items(time).required(),
  documents: documents.optional(),
  recordings: recordings.optional(),
  studentIds: Joi.array().items(ObjectIdSchema).optional(),
  isUseGoogleMeet: Joi.boolean().optional(),
  syllabusId: ObjectIdSchema.optional().allow(null),
  lectureIds: Joi.when('syllabusId', {
    is: Joi.exist(),
    then: lectureIds.required(),
    otherwise: Joi.forbidden(),
  }),
  googleConfig: Joi.when('isUseGoogleMeet', {
    is: true,
    then: GoogleConfigSchema.required(),
    otherwise: Joi.forbidden(),
  }),
});

export const UpdateLessonSchema = Joi.object({
  name: name.optional(),
  room: room.optional(),
  isUseGoogleMeet: Joi.boolean().optional(),
  teacherId: teacher.optional(),
  subjectId: subject.optional(),
  date: date.optional(),
  startTime: startTime.optional(),
  endTime: endTime.min(Joi.ref('startTime')).optional(),
  documents: documents.allow(null).optional(),
  recordings: recordings.allow(null).optional(),
  studentIds: Joi.array().items(ObjectIdSchema).optional(),
  syllabusId: ObjectIdSchema.optional().allow(null),
  lectureIds: lectureIds.optional().allow(),
  googleConfig: Joi.when('isUseGoogleMeet', {
    is: true,
    then: GoogleConfigSchema.required(),
    otherwise: Joi.forbidden(),
  }),
});

export const lessonFilterSchema = Joi.object({
  ...BaseFilterSchema,
  courseIds: Joi.array().items(ObjectIdSchema.optional()).unique().optional(),
  classroomIds: Joi.array()
    .items(ObjectIdSchema.optional())
    .unique()
    .optional(),
  subjectIds: Joi.array().items(ObjectIdSchema.optional()).unique().optional(),
  statuses: Joi.array()
    .items(Joi.string().valid(...Object.values(LessonStatus)))
    .optional(),
});

export const ScheduleListFilterSchema = Joi.object({
  classroomIds: Joi.array().items(ObjectIdSchema).optional(),
  teacherIds: Joi.array().items(ObjectIdSchema).optional(),
  subjectIds: Joi.array().items(ObjectIdSchema).optional(),
  startDate: Joi.date().format('YYYY-MM-DD').required(),
  endDate: Joi.date().format('YYYY-MM-DD').min(Joi.ref('startDate')).required(),
});

export const lessonScheduleForTeacherSchema = Joi.object({
  classroomIds: Joi.array().items(ObjectIdSchema).optional(),
  subjectIds: Joi.array().items(ObjectIdSchema).optional(),
  startDate: Joi.date().format('YYYY-MM-DD').required(),
  endDate: Joi.date().format('YYYY-MM-DD').min(Joi.ref('startDate')).required(),
});

export const CreateAbsentRequestSchema = Joi.object({
  lessonId: ObjectIdSchema.required(),
  reason: Joi.string().max(MEMO_MAX_LENGTH).required(),
});

export const ProcessAbsentRequestSchema = Joi.object({
  status: Joi.string()
    .valid(AbsentRequestStatus.APPROVED, AbsentRequestStatus.UNAPPROVED)
    .required(),
});
