import { BaseFilterSchema, ObjectIdSchema } from '@/common/validations';
import {
  INPUT_TEXT_MAX_LENGTH,
  TEXTAREA_MAX_LENGTH,
  TIME_MAX_LENGTH,
} from 'src/common/constants';
import Joi from 'src/plugins/joi';
import type {} from 'joi';
import { MIN_COURSE_NAME } from './course.constants';

const nameSchema = Joi.string().min(MIN_COURSE_NAME).max(INPUT_TEXT_MAX_LENGTH);
const descriptionSchema = Joi.string().max(TEXTAREA_MAX_LENGTH).allow('', null);
const subjectIdsSchema = Joi.array().items(ObjectIdSchema).unique();
const courseFormIdsSchema = Joi.array().items(ObjectIdSchema).unique();
const timeSchema = Joi.number().max(TIME_MAX_LENGTH);
const tuitionSchema = Joi.number().min(0);

export const createCourseSchema = Joi.object({
  name: nameSchema.required(),
  description: descriptionSchema.optional(),
  subjectIds: subjectIdsSchema.optional(),
  courseFormIds: courseFormIdsSchema.optional(),
  times: timeSchema.required(),
  tuition: tuitionSchema.required(),
});

export const updateCourseSchema = Joi.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  subjectIds: subjectIdsSchema.optional(),
  courseFormIds: courseFormIdsSchema.optional(),
  times: timeSchema.optional(),
  tuition: tuitionSchema.optional(),
});

export const courseDropdownSchema = Joi.object({
  classRoomId: ObjectIdSchema.optional(),
});

export const courseFilterSchema = Joi.object({
  ...BaseFilterSchema,
  courseFormIds: Joi.array().items(ObjectIdSchema).optional(),
});
