import Joi from '@/plugins/joi';
import { userCreateBaseSchema, userUpdateBaseSchema } from './user.validators';
import { teacherDetailSchema } from './teacher.validators';
import { BaseFilterSchema } from '@/common/validations/common.validation';
import type {} from 'joi';

const managerDetailSChema = Joi.object({
  signedContractDate: Joi.date().optional(),
});

export const createManagerSchema = Joi.object().keys({
  ...userCreateBaseSchema,
  isTeacher: Joi.boolean().required(),
  managerDetail: managerDetailSChema.optional(),
  teacherDetail: Joi.when('isTeacher', {
    is: true,
    then: teacherDetailSchema.required(),
    otherwise: teacherDetailSchema.optional(),
  }),
});

export const managerFilterSchema = Joi.object().keys({
  ...BaseFilterSchema,
  isTeacher: Joi.boolean().optional(),
});

export const updateManagerSchema = Joi.object().keys({
  ...userUpdateBaseSchema,
  managerDetail: managerDetailSChema.optional(),
  isTeacher: Joi.boolean().required(),
  teacherDetail: teacherDetailSchema.optional(),
});
