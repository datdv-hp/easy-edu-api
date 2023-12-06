import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { IContext } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema, deleteManySchema } from '@/common/validations';
import { LectureRepository } from '@/database/repositories';
import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import { LectureService } from '../services/lecture.service';
import {
  ILectureCreateFormData,
  ILectureUpdateFormData,
} from '../syllabus.interfaces';
import {
  GetLecturesOfSyllabusQuerySchema,
  lectureCreateSchema,
  lectureUpdateSchema,
} from '../syllabus.validators';
import { LectureCheckUtil } from '../utils/lecture-check.util';
import { SyllabusCheckUtil } from '../utils/syllabus-check.util';

@Controller('lecture')
export class LectureController {
  constructor(
    private readonly service: LectureService,
    private readonly syllabusCheckUtil: SyllabusCheckUtil,
    private readonly checkUtil: LectureCheckUtil,
    private readonly repo: LectureRepository,
  ) {}

  @RolesGuard(['syllabus.create'])
  @Post()
  async createLecture(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(lectureCreateSchema))
    body: ILectureCreateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkSyllabusExist = await this.syllabusCheckUtil.syllabusExistById(
        body.syllabusId,
        'syllabusId',
      );
      if (!checkSyllabusExist.valid) return checkSyllabusExist.error;

      const newLectureNames = body.lectures.map((lecture) => lecture.name);
      const checkNotExistAnyLectureByNames =
        await this.checkUtil.LectureNotExistByNamesAndSyllabusId({
          names: newLectureNames,
          syllabusId: body.syllabusId,
        });
      if (!checkNotExistAnyLectureByNames.valid)
        return checkNotExistAnyLectureByNames.error;

      const lectures = await this.service.create(body, context.user.id);

      return new SuccessResponse(lectures);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Get()
  async getLectures(
    @Query(
      new TrimBodyPipe(),
      new JoiValidationPipe(GetLecturesOfSyllabusQuerySchema),
    )
    query: {
      ids: string[];
    },
  ) {
    try {
      const lectures = await this.repo
        .findByIds(query.ids, { files: 1, name: 1, referenceLinks: 1 })
        .lean()
        .exec();
      return new SuccessResponse(lectures);
    } catch (error) {
      return new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.update'])
  @Patch('/:syllabusId')
  async updateLecture(
    @Param('syllabusId', new JoiValidationPipe(ObjectIdSchema))
    syllabusId: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(lectureUpdateSchema))
    body: ILectureUpdateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkSyllabusExist = await this.syllabusCheckUtil.syllabusExistById(
        syllabusId,
      );
      if (!checkSyllabusExist.valid) return checkSyllabusExist.error;

      const lectureIds = body.lectures.map((lecture) => lecture.lectureId);
      const checkLecturesExist = await this.checkUtil.lecturesExistByIds(
        lectureIds,
      );
      if (!checkLecturesExist.valid) return checkLecturesExist.error;

      // validate unique lecture name
      const newNameLectures = body.lectures.map((lecture) => lecture.name);
      const checkNotExistAnyLectureByNames =
        await this.checkUtil.LectureNotExistByNamesAndSyllabusId({
          names: newNameLectures,
          syllabusId,
          ids: lectureIds,
        });
      if (!checkNotExistAnyLectureByNames.valid)
        return checkNotExistAnyLectureByNames.error;

      const lectures = await this.service.updateMany(
        syllabusId,
        body,
        context.user.id,
      );
      return new SuccessResponse(lectures);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.delete'])
  @Delete()
  async deleteManyLecture(
    @I18n() i18n: I18nContext,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(deleteManySchema))
    ids: string[],
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkLecturesExist = await this.checkUtil.lecturesExistByIds(
        ids,
        'ids',
        { name: 1, syllabusId: 1 },
      );
      if (!checkLecturesExist.valid) return checkLecturesExist.error;
      const lectures = checkLecturesExist.data;

      const lectureNames = lectures.map((lecture) => lecture.name).join(', ');
      const infoUpdateSyllabus = {
        syllabusId: lectures[0].syllabusId,
        note: `${i18n.translate('syllabus.deleteLecture')}: ${lectureNames}`,
      };

      const isSuccess = await this.service.deleteByIds(
        ids,
        infoUpdateSyllabus,
        context?.user.id,
      );
      return new SuccessResponse(isSuccess);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
