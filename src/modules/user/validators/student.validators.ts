import { ObjectIdSchema } from '@/common/validations';
import { BaseFilterSchema } from '@/common/validations/common.validation';
import { ClassroomStatus, StudentDegree } from '@/database/constants';
import Joi from '@/plugins/joi';
import type {} from 'joi';
import { userCreateBaseSchema, userUpdateBaseSchema } from './user.validators';

export const studentFilterSchema = Joi.object().keys({
  ...BaseFilterSchema,
  courseIds: Joi.array().items(ObjectIdSchema).unique().optional(),
});

export const classroomByStudentFilterSchema = Joi.object().keys({
  ...BaseFilterSchema,
  status: Joi.string()
    .valid(...Object.values(ClassroomStatus))
    .optional(),
});

const studentDetailSchema = Joi.object({
  degree: Joi.string().valid(...Object.values(StudentDegree)),
  courses: Joi.array().items({
    courseId: ObjectIdSchema,
    subjectIds: Joi.array().items(ObjectIdSchema).unique().allow(null),
    presenterId: ObjectIdSchema.allow(null).optional(),
  }),
});

export const createStudentSchema = Joi.object().keys({
  ...userCreateBaseSchema,
  studentDetail: studentDetailSchema.required(),
  registrationId: ObjectIdSchema.optional(),
});

export const updateStudentSchema = Joi.object().keys({
  ...userUpdateBaseSchema,
  studentDetail: studentDetailSchema.optional(),
});
