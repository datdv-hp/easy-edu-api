import ConfigKey from '@/common/config/config-key';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { IContext } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import {
  Body,
  Controller,
  Delete,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { IFileInfo } from './upload.interfaces';
import { UploadService } from './upload.service';
import {
  createAvatarSchema,
  createLessonRecordSchema,
  createSyllabusCoverImageSchema,
  createSyllabusFileSchema,
  deleteUploadedFilesBodySchema,
} from './upload.validators';

const AVATAR_PREFIX = 'avatars/';
const LESSON_RECORD_PREFIX = 'lesson-record/';
const SYLLABUS_PREFIX = 'syllabus/';

@Controller()
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private configService: ConfigService,
  ) {}

  @Post('avatar/presigned-url')
  async prepareUpload(
    @Body(new JoiValidationPipe(createAvatarSchema)) dto: IFileInfo,
    @EasyContext() context: IContext,
  ) {
    try {
      const avatarBucket = this.configService.get(ConfigKey.AWS_S3_BUCKET_NAME);
      const { contentType } = dto;
      const signedUrl = await this.uploadService.prepareUpload(
        {
          name: `${randomUUID()}.${contentType.split('/')[1]}`,
          contentType: contentType,
          prefix: `${AVATAR_PREFIX}${context.user.id}/`,
        },
        avatarBucket,
      );
      return new SuccessResponse(signedUrl);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post('lesson-record/presigned-url')
  async prepareUploadLessonRecord(
    @Body(new JoiValidationPipe(createLessonRecordSchema)) body: IFileInfo,
    @EasyContext() context: IContext,
  ) {
    try {
      const lessonRecordBucket = this.configService.get(
        ConfigKey.AWS_S3_BUCKET_NAME,
      );
      const signedUrl = await this.uploadService.prepareUpload(
        {
          name: `${randomUUID()}.${body.contentType.split('/')[1]}`,
          contentType: body.contentType,
          prefix: `${LESSON_RECORD_PREFIX}${context.user.id}/`,
        },
        lessonRecordBucket,
      );
      return new SuccessResponse(signedUrl);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post('syllabus/presigned-url')
  async prepareUploadSyllabus(
    @Body(new JoiValidationPipe(createSyllabusFileSchema)) body: IFileInfo,
  ) {
    try {
      const lessonRecordBucket = this.configService.get(
        ConfigKey.AWS_S3_BUCKET_NAME,
      );
      const signedUrl = await this.uploadService.prepareUpload(
        {
          name: `${randomUUID()}.${body.contentType.split('/')[1]}`,
          contentType: body.contentType,
          prefix: SYLLABUS_PREFIX,
        },
        lessonRecordBucket,
      );
      return new SuccessResponse(signedUrl);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post('syllabus-cover/presigned-url')
  async prepareUploadSyllabusImageCover(
    @Body(new JoiValidationPipe(createSyllabusCoverImageSchema))
    body: IFileInfo,
  ) {
    try {
      const lessonRecordBucket = this.configService.get(
        ConfigKey.AWS_S3_BUCKET_NAME,
      );
      const signedUrl = await this.uploadService.prepareUpload(
        {
          name: `${randomUUID()}.${body.contentType.split('/')[1]}`,
          contentType: body.contentType,
          prefix: SYLLABUS_PREFIX,
        },
        lessonRecordBucket,
      );
      return new SuccessResponse(signedUrl);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Delete('uploaded-file')
  async deleteUploadedFiles(
    @Body(new JoiValidationPipe(deleteUploadedFilesBodySchema))
    body: {
      urls: string[];
    },
  ) {
    try {
      const bucket = this.configService.get(ConfigKey.AWS_S3_BUCKET_NAME);
      const res = await this.uploadService.deleteFiles(body.urls, bucket);
      return new SuccessResponse(res);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
