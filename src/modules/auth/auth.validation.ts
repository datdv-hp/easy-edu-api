import { INPUT_TEXT_MAX_LENGTH, TEXTAREA_MAX_LENGTH } from '@/common/constants';
import Joi from '@/plugins/joi';
import { AuthProvider } from './auth.constant';

export const loginBodySchema = Joi.object().keys({
  provider: Joi.string()
    .valid(...Object.values(AuthProvider))
    .optional(),
  email: Joi.when('provider', {
    is: AuthProvider.EMAIL,
    then: Joi.string().required().trim().max(INPUT_TEXT_MAX_LENGTH),
    otherwise: Joi.forbidden(),
  }),
  password: Joi.when('provider', {
    is: AuthProvider.EMAIL || undefined,
    then: Joi.string().max(INPUT_TEXT_MAX_LENGTH).required(),
    otherwise: Joi.forbidden(),
  }),

  token: Joi.when('provider', {
    is: Joi.valid(AuthProvider.GOOGLE),
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  redirectUri: Joi.when('provider', {
    switch: [
      {
        is: Joi.exist().valid(AuthProvider.GOOGLE),
        then: Joi.string().max(TEXTAREA_MAX_LENGTH).uri().required(),
      },
    ],
    otherwise: Joi.forbidden(),
  }),
});
