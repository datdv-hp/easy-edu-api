import Joi from '@/plugins/joi';
import type {} from 'joi';
import ConfigKey from './config-key';
import { LogLevel } from '../constants';
export default Joi.object({
  [ConfigKey.PORT]: Joi.number().default(3000),
  [ConfigKey.VERSION]: Joi.string().required(),
  // [ConfigKey.TZ]: Joi.string().required(),
  [ConfigKey.DEFAULT_TIMEZONE]: Joi.string().required(),
  [ConfigKey.DEFAULT_TIMEZONE_NAME]: Joi.string().required(),
  [ConfigKey.BASE_PATH]: Joi.string().required(),
  [ConfigKey.LOG_LEVEL]: Joi.string()
    .required()
    .valid(...Object.values(LogLevel)),
  [ConfigKey.MONGO_DATABASE_CONNECTION_STRING]: Joi.string().required(),
  [ConfigKey.MONGO_DEBUG]: Joi.string().required(),
  [ConfigKey.REDIS_HOST]: Joi.string().required(),
  [ConfigKey.REDIS_PORT]: Joi.number().required(),
  [ConfigKey.REDIS_PASSWORD]: Joi.string().required(),
  [ConfigKey.REDIS_CACHE_TTL]: Joi.number().required(),
  [ConfigKey.REDIS_PING_INTERVAL]: Joi.number().required(),
  [ConfigKey.REDIS_TLS]: Joi.boolean().required(),
  [ConfigKey.CORS_WHITELIST]: Joi.string().required(),
  [ConfigKey.JWT_ACCESS_TOKEN_SECRET_KEY]: Joi.string().required(),
  [ConfigKey.JWT_ACCESS_TOKEN_EXPIRES_IN]: Joi.number().required(),
  [ConfigKey.JWT_REFRESH_TOKEN_SECRET_KEY]: Joi.string().required(),
  [ConfigKey.JWT_REFRESH_TOKEN_EXPIRES_IN]: Joi.number().required(),
  [ConfigKey.GOOGLE_CLIENT_ID]: Joi.string().required(),
  [ConfigKey.GOOGLE_CLIENT_SECRET]: Joi.string().required(),
  [ConfigKey.AWS_S3_BUCKET_NAME]: Joi.string().required(),
  [ConfigKey.AWS_S3_BUCKET_REGION]: Joi.string().required(),
  [ConfigKey.AWS_ACCESS_KEY_ID]: Joi.string().required(),
  [ConfigKey.AWS_SECRET_ACCESS_KEY]: Joi.string().required(),
  [ConfigKey.MAIL_FROM]: Joi.string().required(),
  [ConfigKey.MAIL_PORT]: Joi.number().required(),
  [ConfigKey.MAIL_USER]: Joi.string().required(),
  [ConfigKey.MAIL_PASSWORD]: Joi.string().required(),
  [ConfigKey.MAIL_HOST]: Joi.string().required(),
  [ConfigKey.FRONTEND_DOMAIN]: Joi.string().required(),
  [ConfigKey.EXPIRED_ACTIVE_ACCOUNT_HOURS]: Joi.number().required(),
});
