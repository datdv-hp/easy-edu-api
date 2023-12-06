import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { Lecture } from '@/database/mongo-schemas';
import { LectureRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery, ProjectionType, Types } from 'mongoose';

@Injectable()
export class LectureCheckUtil extends BaseService {
  constructor(
    private readonly repo: LectureRepository,
    protected readonly configService: ConfigService,
  ) {
    super(LectureCheckUtil.name, configService);
  }

  async LectureNotExistByNamesAndSyllabusId(
    params: {
      names: string[];
      syllabusId: string;
      ids?: (string | Types.ObjectId)[];
    },
    errorKey = 'name',
    select: ProjectionType<Lecture> = { name: 1 },
  ) {
    try {
      const filter: FilterQuery<Lecture> = {
        syllabusId: params.syllabusId,
        name: { $in: params.names },
      };
      if (params.ids?.length) {
        filter._id = { $nin: params.ids };
      }
      const lectures = await this.repo.find(filter, select).lean().exec();

      if (lectures?.length) {
        const namesExist = lectures.map((lecture) => lecture.name);
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('lecture.exist'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate('lecture.exist'),
              data: namesExist,
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      this.logger.error(
        'Error in duplicateLectureByNamesAndSyllabusId checkUtil',
        error,
      );
      throw error;
    }
  }

  async lecturesExistByIds(
    lectureIds: (string | Types.ObjectId)[],
    errorKey = 'ids',
    select: ProjectionType<Lecture> = { _id: 1 },
  ) {
    try {
      const lecturesExist = await this.repo
        .findByIds(lectureIds, select)
        .lean()
        .exec();
      if (lecturesExist.length !== lectureIds.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('lecture.notFound'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('lecture.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: lecturesExist };
    } catch (error) {
      this.logger.error('Error in lecturesExistByIds checkUtil', error);
      throw error;
    }
  }
}
