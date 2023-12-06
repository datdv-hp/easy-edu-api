import Joi from '@/plugins/joi';
import { TEXTAREA_MAX_LENGTH } from 'src/common/constants';
import {} from 'joi';

export const GoogleLoginLinkSchema = Joi.object({
  redirectUri: Joi.string().max(TEXTAREA_MAX_LENGTH).uri().required(),
  scopes: Joi.array()
    .items(Joi.string().max(TEXTAREA_MAX_LENGTH).uri())
    .min(1)
    .unique()
    .required(),
});
export const GoogleLoginEmailSchema = Joi.object({
  redirectUri: Joi.string().max(TEXTAREA_MAX_LENGTH).uri().required(),
  code: Joi.string().max(TEXTAREA_MAX_LENGTH).required(),
});
