import { BaseFilterSchema, ObjectIdSchema } from '@/common/validations';
import { INPUT_TEXT_MAX_LENGTH } from 'src/common/constants';
import Joi from 'src/plugins/joi';

const name = Joi.string().max(INPUT_TEXT_MAX_LENGTH);

export const createCourseFormSchema = Joi.object({
  name: name.required(),
});

export const updateCourseFormSchema = Joi.object({
  name: name.required(),
});

export const CourseFormFilterSchema = Joi.object({
  ...BaseFilterSchema,
});

export const bulkDeleteCourseFormSettingsSchema = Joi.object().keys({
  ids: Joi.array().items(ObjectIdSchema.required()).min(1).unique().required(),
});
