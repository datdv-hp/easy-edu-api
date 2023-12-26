import Joi from 'src/plugins/joi';
import { PromotionStatus } from './promotion-setting.constant';

import { BaseFilterSchema, ObjectIdSchema } from '@/common/validations';
import { PromotionType } from '@/database/constants';
import {
  INPUT_TEXT_MAX_LENGTH,
  TEXTAREA_MAX_LENGTH,
} from 'src/common/constants';
import dayjs from 'src/plugins/dayjs';

const nameSchema = Joi.string().trim().max(INPUT_TEXT_MAX_LENGTH);
const descriptionSchema = Joi.string()
  .trim()
  .allow('', null)
  .max(TEXTAREA_MAX_LENGTH);
const applyForCourseIdsSchema = Joi.array().items(ObjectIdSchema);
const timesSchema = Joi.number().min(0);
const typeSchema = Joi.valid(...Object.values(PromotionType));
const valueSchema = Joi.when('type', {
  is: PromotionType.PERCENTAGE,
  then: Joi.number().min(0).required().max(100),
  otherwise: Joi.number().min(0).required(),
});

export const promotionSettingListFilterSchema = Joi.object().keys({
  ...BaseFilterSchema,
  courseIds: Joi.array().items(ObjectIdSchema).optional(),
  statuses: Joi.array()
    .items(Joi.valid(...Object.values(PromotionStatus)))
    .optional(),
});

export const promotionSettingCreateBodySchema = Joi.object().keys({
  name: nameSchema.required(),
  description: descriptionSchema,
  info: Joi.object()
    .keys({
      type: typeSchema.required(),
      value: valueSchema.required(),
    })
    .required(),
  applyForCourseIds: applyForCourseIdsSchema,
  times: timesSchema.required(),
  startAt: Joi.date().min(dayjs().startOf('day').toDate()).required(),
  endAt: Joi.date().min(Joi.ref('startAt')).required(),
});

export const promotionSettingUpdateBodySchema = Joi.object().keys({
  name: nameSchema.optional(),
  description: descriptionSchema,
  info: Joi.object().keys({
    type: typeSchema.required(),
    value: valueSchema.required(),
  }),
  applyForCourseIds: applyForCourseIdsSchema,
  times: timesSchema.optional(),
  startAt: Joi.date().optional(),
  endAt: Joi.date().min(Joi.ref('startAt')).optional(),
});

export const promotionUtilizationListFilterSchema = Joi.object().keys({
  ...BaseFilterSchema,
});
