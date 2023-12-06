import { INPUT_TEXT_MAX_LENGTH } from 'src/common/constants';
import {
  BaseFilterSchema,
  ObjectIdSchema,
} from '@/common/validations/common.validation';
import { MimeType } from '@/database/constants';
import Joi from 'src/plugins/joi';

const DOCUMENT_ARRAY_MAX_LENGTH = 5;
const name = Joi.string().max(INPUT_TEXT_MAX_LENGTH);
const image = Joi.string().max(INPUT_TEXT_MAX_LENGTH).allow(null);
const note = Joi.string().max(500);
const documentFiles = Joi.array()
  .items(
    Joi.object({
      link: Joi.string().max(INPUT_TEXT_MAX_LENGTH).allow('').required(),
      mimeType: Joi.string()
        .valid(...Object.values(MimeType))
        .required(),
      name: name.required(),
    }),
  )
  .max(DOCUMENT_ARRAY_MAX_LENGTH);
const lectures = Joi.array()
  .items(
    Joi.object({
      name: name.required(),
      referenceLinks: Joi.array()
        .items(Joi.string().uri().max(INPUT_TEXT_MAX_LENGTH))
        .max(DOCUMENT_ARRAY_MAX_LENGTH)
        .optional(),
      files: Joi.when('referenceLinks', {
        is: Joi.exist(),
        then: documentFiles.optional(),
        otherwise: documentFiles.required(),
      }),
    }),
  )
  .unique('name');

// validate syllabus

export const CreateSyllabusSchema = Joi.object({
  name: name.required(),
  image: image.optional(),
  lectures: lectures.optional(),
});

export const UpdateSyllabusSchema = Joi.object({
  name: name.optional(),
  image: image.optional(),
});

export const syllabusFilterSchema = Joi.object(BaseFilterSchema);

// validate lecture

export const lectureCreateSchema = Joi.object({
  syllabusId: ObjectIdSchema.required(),
  note: note.required(),
  lectures: lectures.required(),
});

export const lectureUpdateSchema = Joi.object({
  note: note.required(),
  lectures: Joi.array()
    .items(
      Joi.object({
        name: name.optional(),
        referenceLinks: Joi.array()
          .items(Joi.string().uri().max(INPUT_TEXT_MAX_LENGTH))
          .max(DOCUMENT_ARRAY_MAX_LENGTH)
          .optional(),
        files: documentFiles.optional(),
        lectureId: ObjectIdSchema.required(),
      }),
    )
    .unique('name')
    .unique('lectureId')
    .required(),
});

export const lectureFilterSchema = Joi.object(BaseFilterSchema);

export const SyllabusEditHistoryFilterSchema = Joi.object(BaseFilterSchema);

export const GetLecturesOfSyllabusQuerySchema = Joi.object({
  ids: Joi.array().items(ObjectIdSchema).unique().required(),
});

export const fileNameSchema = Joi.string().required();
