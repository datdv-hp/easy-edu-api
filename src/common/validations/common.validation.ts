import Joi from '@/plugins/joi';
import type {} from 'joi';
import { isValidObjectId } from 'mongoose';
import {
  DefaultOrderBy,
  INPUT_TEXT_MAX_LENGTH,
  MAX_PAGE_LIMIT,
  MAX_PAGE_VALUE,
  MIN_PAGE_LIMIT,
  MIN_PAGE_VALUE,
  OrderDirection,
} from '../constants';

export const ObjectIdSchema = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) {
    return helpers.error('any.invalid');
  }
  return value;
});
export const IdOrSlugSchema = Joi.string().required();
export const deleteManySchema = Joi.array()
  .items(ObjectIdSchema)
  .unique()
  .required();
export const ObjectIdsSchema = Joi.array().items(ObjectIdSchema);
export const BaseFilterSchema = {
  page: Joi.number()
    .min(MIN_PAGE_VALUE)
    .max(MAX_PAGE_VALUE)
    .optional()
    .allow(null),
  limit: Joi.number()
    .min(MIN_PAGE_LIMIT)
    .max(MAX_PAGE_LIMIT)
    .optional()
    .allow(null),
  keyword: Joi.string().max(INPUT_TEXT_MAX_LENGTH).optional().allow(null, ''),
  orderDirection: Joi.string()
    .valid(...Object.values(OrderDirection))
    .optional(),
  orderBy: Joi.string()
    .valid(...Object.values(DefaultOrderBy))
    .optional(),
};
