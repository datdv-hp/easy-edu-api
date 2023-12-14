import { ClassroomStatus } from '@/database/constants';
import dayjs from 'dayjs';
import { INPUT_TEXT_MAX_LENGTH, Regex } from 'src/common/constants';
import Joi from 'src/plugins/joi';
import type {} from 'joi';

import { MIN_CLASS_NAME } from './classroom.constants';
import { ObjectIdSchema, BaseFilterSchema } from '@/common/validations';

const nameSchema = Joi.string().min(MIN_CLASS_NAME).max(INPUT_TEXT_MAX_LENGTH);
const startDateSchema = Joi.date().min(dayjs().format('YYYY-MM-DD')).iso();
const endDateSchema = Joi.date().min(Joi.ref('startDate'));
const participantIdsSChema = Joi.array().items(ObjectIdSchema).unique();
const colorSchema = Joi.string().regex(new RegExp(Regex.COLOR));
const teacherIdsSchema = Joi.array().items(ObjectIdSchema).unique();
const syllabusIdsSchema = Joi.array().items(ObjectIdSchema).unique();
const paymentDateSchema = Joi.object({
  startDate: startDateSchema.required(),
  endDate: endDateSchema.required(),
});

export const classroomCreateSchema = Joi.object({
  name: nameSchema.required(),
  courseId: ObjectIdSchema.required(),
  startDate: startDateSchema.required(),
  endDate: endDateSchema.required(),
  participantIds: participantIdsSChema.optional(),
  color: colorSchema.optional(),
  teacherIds: teacherIdsSchema.optional(),
  syllabusIds: syllabusIdsSchema.optional(),
  paymentDate: paymentDateSchema.required(),
});

export const classroomUpdateSchema = Joi.object({
  name: nameSchema.optional(),
  courseId: ObjectIdSchema.optional(),
  startDate: startDateSchema.optional(),
  endDate: Joi.date().format('YYYY-MM-DD').iso().optional(),
  participantIds: Joi.when('courseId', {
    is: Joi.exist(),
    then: participantIdsSChema.required(),
    otherwise: participantIdsSChema.optional(),
  }),
  color: colorSchema.optional(),
  teacherIds: teacherIdsSchema.optional(),
  syllabusIds: syllabusIdsSchema.optional(),
  paymentDate: paymentDateSchema.optional(),
});

export const classFilterSchema = Joi.object({
  ...BaseFilterSchema,
  courseIds: Joi.array().items(ObjectIdSchema).unique().optional(),
  statuses: Joi.array()
    .items(Joi.string().valid(...Object.values(ClassroomStatus)))
    .unique()
    .optional(),
});

export const getTotalStudentSchema = Joi.object({
  subjectId: ObjectIdSchema.required(),
  classroomId: ObjectIdSchema.required(),
});

export const studentFilterReviewTeacher = Joi.object().keys({
  classroomId: ObjectIdSchema.required(),
  subjectId: ObjectIdSchema.required(),
  teacherId: ObjectIdSchema.required(),
});

export const classroomSyllabusListQuerySchema =
  Joi.object().keys(BaseFilterSchema);
