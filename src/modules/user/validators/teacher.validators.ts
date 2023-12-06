import { INPUT_TEXT_MAX_LENGTH } from '@/common/constants';
import {
  BaseFilterSchema,
  ObjectIdSchema,
} from '@/common/validations/common.validation';
import { ClassroomStatus } from '@/database/constants';
import Joi from '@/plugins/joi';
import type {} from 'joi';
import { userCreateBaseSchema, userUpdateBaseSchema } from './user.validators';

export const teacherDetailSchema = Joi.object({
  subjectIds: Joi.array().items(ObjectIdSchema).unique().optional(),
  degree: Joi.string().optional().allow('', null),
  workUnit: Joi.string().max(INPUT_TEXT_MAX_LENGTH).allow('').optional(),
  signedContractDate: Joi.date().optional(),
  note: Joi.string().optional().allow('', null),
  nationality: Joi.string().optional().allow('', null),
  identity: Joi.string().optional().allow('', null),
});

export const createTeacherSchema = Joi.object().keys({
  ...userCreateBaseSchema,
  teacherDetail: teacherDetailSchema.optional(),
});

export const updateTeacherSchema = Joi.object().keys({
  ...userUpdateBaseSchema,
  teacherDetail: teacherDetailSchema.optional(),
});

export const teacherFilterSchema = Joi.object().keys({
  ...BaseFilterSchema,
  subjectIds: Joi.array().items(ObjectIdSchema).unique().optional(),
});

export const classroomByTeacherFilterSchema = Joi.object().keys({
  ...BaseFilterSchema,
  status: Joi.string()
    .valid(...Object.values(ClassroomStatus))
    .optional(),
  courseIds: Joi.array().items(ObjectIdSchema).unique().optional(),
});
