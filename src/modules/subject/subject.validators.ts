import { INPUT_TEXT_MAX_LENGTH, Regex } from 'src/common/constants';
import Joi from 'src/plugins/joi';
import {
  BaseFilterSchema,
  ObjectIdSchema,
} from '@/common/validations/common.validation';

const INPUT_TEXT_DESCRIPTION_MAX_LENGTH = 2000;
const nameSchema = Joi.string().max(INPUT_TEXT_MAX_LENGTH);
const subjectCodeSchema = Joi.string().max(INPUT_TEXT_MAX_LENGTH);
const descriptionSchema = Joi.string()
  .max(INPUT_TEXT_DESCRIPTION_MAX_LENGTH)
  .allow('');
const documentsSchema = Joi.array()
  .max(10)
  .items(
    Joi.object({
      name: Joi.string()
        .regex(new RegExp(Regex.DOCUMENT))
        .max(INPUT_TEXT_MAX_LENGTH)
        .allow('')
        .optional(),
      link: Joi.string().uri().max(INPUT_TEXT_MAX_LENGTH).allow('').optional(),
    }),
  );

export const subjectCreateSchema = Joi.object({
  name: nameSchema.required(),
  subjectCode: subjectCodeSchema.required(),
  description: descriptionSchema.optional(),
  documents: documentsSchema.optional(),
});

export const subjectUpdateSchema = Joi.object({
  name: nameSchema.optional(),
  subjectCode: subjectCodeSchema.optional(),
  description: descriptionSchema.optional(),
  documents: documentsSchema.optional(),
});

export const subjectFilterSchema = Joi.object().keys({
  ...BaseFilterSchema,
  courseId: ObjectIdSchema.optional(),
  classroomId: ObjectIdSchema.optional(),
});
