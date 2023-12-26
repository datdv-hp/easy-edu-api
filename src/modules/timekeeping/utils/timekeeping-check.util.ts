import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { Lesson, Timekeeping, User } from '@/database/mongo-schemas';
import {
  LessonRepository,
  TimekeepingRepository,
  UserRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { difference } from 'lodash';
import { ProjectionType } from 'mongoose';

@Injectable()
export class TimekeepingCheckUtil extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly userRepo: UserRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly timekeepingRepo: TimekeepingRepository,
  ) {
    super(TimekeepingCheckUtil.name, configService);
  }

  async TimekeepingExistById(
    id: string,
    select: ProjectionType<Timekeeping> = { _id: 1 },
  ) {
    try {
      const timekeepingExist = await this.timekeepingRepo.findById(id, select);
      if (!timekeepingExist) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('timekeeping.somethingWrong'),
          [
            {
              key: 'timekeeping',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('timekeeping.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: timekeepingExist };
    } catch (error) {
      this.logger.error('Error in TimekeepingExistById checkUtil', error);
      throw error;
    }
  }

  async TimekeepingNotExistByUserIdAndLessonId(params: {
    userId: string;
    lessonId: string;
  }) {
    try {
      const timekeeping = await this.timekeepingRepo.findOne(
        { userId: params.userId, lessonId: params.lessonId },
        { _id: 1 },
      );
      if (timekeeping) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('timekeeping.somethingWrong'),
          [
            {
              key: 'timekeeping',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('timekeeping.exist'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      this.logger.error(
        'Error in TimekeepingNotExistByUserIdAndLessonId checkUtil',
        error,
      );
      throw error;
    }
  }

  async UsersExistByIds(
    ids: string[],
    select: ProjectionType<User> = { _id: 1 },
    errorKey = 'userId',
  ) {
    try {
      const usersExist = await this.userRepo
        .findByIds(ids, select)
        .lean()
        .exec();
      const usersExistIds = usersExist.map((user) => user._id.toString());
      const usersNotExisted = difference(ids, usersExistIds);
      if (usersExist.length !== ids.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('timekeeping.userNotExisted'),
              data: usersNotExisted,
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: usersExist };
    } catch (error) {
      this.logger.error('Error in UserExistById checkUtil', error);
      throw error;
    }
  }

  async LessonsExistByIds(
    ids: string[],
    select: ProjectionType<Lesson> = { _id: 1 },
    errorKey = 'lessonId',
  ) {
    try {
      const lessonsExist = await this.lessonRepo
        .findByIds(ids, select)
        .lean()
        .exec();
      const lessonsExistIds = lessonsExist.map((lesson) =>
        lesson._id.toString(),
      );
      const lessonsNotExisted = difference(ids, lessonsExistIds);
      if (lessonsNotExisted.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('lesson.notFound'),
              data: lessonsNotExisted,
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: lessonsExist };
    } catch (error) {
      this.logger.error('Error in LessonsExistByIds checkUtil', error);
      throw error;
    }
  }
}
