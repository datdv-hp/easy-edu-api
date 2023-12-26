import {
  Gender,
  INPUT_TEXT_MAX_LENGTH,
  Regex,
  UserType,
} from '@/common/constants';
import { ObjectIdSchema } from '@/common/validations';
import dayjs from '@/plugins/dayjs';
import Joi from '@/plugins/joi';
import type {} from 'joi';

export const passwordSchema = Joi.string().regex(Regex.PASSWORD).required();
export const firstNameSchema = Joi.string().trim().max(INPUT_TEXT_MAX_LENGTH);
export const lastNameSchema = Joi.string()
  .trim()
  .allow('', null)
  .max(INPUT_TEXT_MAX_LENGTH);
export const avatarSchema = Joi.string().allow('', null);
const nameSchema = Joi.string().max(INPUT_TEXT_MAX_LENGTH);
export const emailSchema = Joi.string()
  .trim()
  .max(INPUT_TEXT_MAX_LENGTH)
  .regex(Regex.EMAIL);
export const dobSchema = Joi.date().iso().max(dayjs().toDate()).allow(null);
export const phoneSchema = Joi.string().trim().regex(Regex.PHONE);
export const genderSchema = Joi.string().valid(...Object.values(Gender));

/**--------------------- */
export const updateTemporaryPasswordBodySchema = Joi.object().keys({
  password: passwordSchema,
});

export const changePasswordBodySchema = Joi.object().keys({
  password: passwordSchema,
  newPassword: passwordSchema,
});

export const updateProfileBodySchema = Joi.object().keys({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  avatar: avatarSchema,
  dob: dobSchema,
  gender: genderSchema,
  type: Joi.string()
    .valid(...Object.values(UserType))
    .required(),
  teacherDetail: Joi.object({
    degree: Joi.string().allow('', null).optional(),
    workUnit: Joi.string()
      .max(INPUT_TEXT_MAX_LENGTH)
      .allow('', null)
      .optional(),
    note: Joi.string().allow('', null).optional(),
  }).optional(),
});

export const userCreateBaseSchema = {
  avatar: avatarSchema,
  name: nameSchema.required(),
  phone: phoneSchema.required(),
  email: emailSchema.required(),
  gender: genderSchema.required(),
  dob: dobSchema.required(),
  roleId: ObjectIdSchema.required(),
};

export const userUpdateBaseSchema = {
  avatar: avatarSchema,
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  gender: genderSchema.optional(),
  dob: dobSchema.optional(),
  roleId: ObjectIdSchema.optional(),
};

export const activeAccountSchema = Joi.object().keys({
  email: emailSchema.required(),
  code: Joi.string().required(),
});
