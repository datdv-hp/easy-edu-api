import Joi from '@/plugins/joi';
import type {} from 'joi';

export const createAvatarSchema = Joi.object({
  contentType: Joi.string()
    .regex(/^image\/(png|jpg|webp|jpeg|gif|tiff|psd|eps|heic)$/)
    .required(),
});

export const createLessonRecordSchema = Joi.object({
  contentType: Joi.string()
    .regex(/^video\/(webm)$/)
    .required(),
});

export const createSyllabusFileSchema = Joi.object({
  contentType: Joi.string()
    .regex(/^video\/(mp4|quicktime|x-ms-wmv)|^application\/pdf$/)
    .required(),
});
export const createSyllabusCoverImageSchema = Joi.object({
  contentType: Joi.string()
    .regex(/^image\/(png|jpg|)/)
    .required(),
});

export const listAssetSchema = Joi.object({
  prefix: Joi.string()
    .regex(/^[0-9a-z!\-_\.\*\'\(\)\/]{1,255}$/)
    .optional(),
});

export const deleteUploadedFilesBodySchema = Joi.object().keys({
  urls: Joi.array().items(Joi.string().uri()).required(),
});
