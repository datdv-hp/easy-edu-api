import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { Classroom, PromotionSetting, Tuition } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  PromotionSettingRepository,
  TuitionRepository,
  UserRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectionType, Types } from 'mongoose';

@Injectable()
export class TuitionCheckUtils extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly classroomRepo: ClassroomRepository,
    private readonly userRepo: UserRepository,
    private readonly promotionSettingRepo: PromotionSettingRepository,
    private readonly repo: TuitionRepository,
  ) {
    super(TuitionCheckUtils.name, configService);
  }

  async existedClassrooms(
    classroomIds: (string | Types.ObjectId)[],
    select: ProjectionType<Classroom> = { _id: 1 },
    errorKey = 'classroomIds',
  ) {
    const existedClassrooms = await this.classroomRepo
      .findByIds(classroomIds, select)
      .lean()
      .exec();
    if (existedClassrooms.length !== classroomIds.length) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: errorKey,
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('classroom.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedClassrooms };
  }

  async existedPresenters(
    presenterIds: (string | Types.ObjectId)[],
    select: ProjectionType<Classroom> = { _id: 1 },
    errorKey = 'presenterIds',
  ) {
    const existedUsers = await this.userRepo
      .findByIds(presenterIds, select)
      .lean()
      .exec();
    if (existedUsers.length !== presenterIds.length) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: errorKey,
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('user.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedUsers };
  }

  async existedTuition(
    id: string,
    select: ProjectionType<Tuition> = { _id: 1 },
    errorKey = 'id',
  ) {
    const existedTuition = await this.repo.findById(id, select).lean().exec();
    if (!existedTuition) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('tuition.notFound'),
        [
          {
            key: errorKey,
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.t('tuition.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedTuition };
  }

  async existedPromotions(
    ids: string[],
    select: ProjectionType<PromotionSetting> = { _id: 1 },
    errorKey = 'promotions',
  ) {
    const existedPromotions = await this.promotionSettingRepo
      .findByIds(ids, select)
      .lean()
      .exec();
    if (existedPromotions.length !== ids.length) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: errorKey,
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('promotion.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedPromotions };
  }
}
