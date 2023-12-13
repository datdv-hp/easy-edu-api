import Joi from '@/plugins/joi';
import { emailSchema, phoneSchema } from '../user/validators/user.validators';
import { INPUT_TEXT_MAX_LENGTH } from '@/common/constants';
import { BaseFilterSchema } from '@/common/validations';
import { RegistrationStatus } from '@/database/constants';

const nameSchema = Joi.string().trim().max(INPUT_TEXT_MAX_LENGTH);

export const StatusSchema = Joi.string().valid(
  ...Object.values(RegistrationStatus),
);
export const createRegistrationBodySchema = Joi.object({
  email: emailSchema.required(),
  name: nameSchema.required(),
  phone: phoneSchema.required(),
});

export const registrationFilterSchema = Joi.object({
  ...BaseFilterSchema,
  statuses: Joi.array().items(StatusSchema).optional(),
});
