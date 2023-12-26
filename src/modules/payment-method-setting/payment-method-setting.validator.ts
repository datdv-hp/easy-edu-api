import { INPUT_TEXT_MAX_LENGTH } from '@/common/constants';
import { BaseFilterSchema } from '@/common/validations';
import Joi from '@/plugins/joi';

const nameSchema = Joi.string().trim().max(INPUT_TEXT_MAX_LENGTH);

export const paymentMethodSettingCreateBodySchema = Joi.object({
  name: nameSchema.required(),
});

export const paymentMethodSettingUpdateBodySchema = Joi.object({
  name: nameSchema.optional(),
});

export const paymentMethodFilterSchema = Joi.object(BaseFilterSchema);
