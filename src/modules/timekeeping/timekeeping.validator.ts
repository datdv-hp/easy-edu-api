import { ObjectIdSchema, BaseFilterSchema } from '@/common/validations';
import Joi from '@/plugins/joi';

export const createTimekeepingSchema = Joi.object({
  userId: ObjectIdSchema.required(),
  lessonId: ObjectIdSchema.required(),
  isAttended: Joi.boolean().required(),
});
export const createManyTimekeepingSchema = Joi.array().items(
  createTimekeepingSchema,
);

export const updateTimekeepingSchema = Joi.object({
  isAttended: Joi.boolean().required(),
});

export const filterTimekeepingSchema = Joi.object({
  ...BaseFilterSchema,
  userIds: Joi.array().items(ObjectIdSchema).unique().optional(),
  date: Joi.date().format('YYYY-MM').optional(),
});

export const TeacherListFilter = Joi.object({
  ...BaseFilterSchema,
  startDate: Joi.date().format('YYYY-MM-DD').required(),
  endDate: Joi.date().format('YYYY-MM-DD').min(Joi.ref('startDate')).required(),
  userIds: Joi.array().items(ObjectIdSchema).unique().optional(),
});

export const filterListTeacherTimekeeping = Joi.object({
  startDate: Joi.date().format('YYYY-MM-DD').required(),
  endDate: Joi.date().format('YYYY-MM-DD').min(Joi.ref('startDate')).required(),
});
