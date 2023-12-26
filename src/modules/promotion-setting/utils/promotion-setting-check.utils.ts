import { stos } from '@/common/helpers/common.functions.helper';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { Course } from '@/database/mongo-schemas';
import {
  CourseRepository,
  PromotionSettingRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectionType } from 'mongoose';
import { HttpStatus } from 'src/common/constants';

@Injectable()
export class PromotionSettingCheckUtils extends BaseService {
  constructor(
    private courseRepo: CourseRepository,
    private repo: PromotionSettingRepository,
    protected readonly configService: ConfigService,
  ) {
    super(PromotionSettingCheckUtils.name, configService);
  }

  async PromotionExistsById(id: string) {
    try {
      const existedPromotion = await this.repo.existedById(id).lean().exec();
      if (!existedPromotion) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('promotion-setting.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      throw error;
    }
  }

  async CoursesExistByIds(
    ids: string[],
    select: ProjectionType<Course> = { _id: 1 },
  ) {
    try {
      const existedCourses = await this.courseRepo
        .findByIds(stos(ids), select)
        .lean()
        .exec();
      if (existedCourses.length !== ids.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('course.notFound'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('course.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      throw error;
    }
  }

  async duplicatedName(name: string, id?: string) {
    try {
      const existedPromotion = await this.repo.findOne({ name }).lean().exec();
      if (existedPromotion && existedPromotion._id.toString() !== id) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'name',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate('promotion-setting.duplicatedName'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      throw error;
    }
  }

  async notBeUsed(_ids: string[]) {
    try {
      const ids = stos(_ids);
      const promotions = await this.repo
        .find({ _id: { $in: ids } }, { usedTimes: 1 })
        .lean()
        .exec();

      if (promotions.length !== ids.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'ids',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('promotion-setting.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      const usedPromotions = promotions.filter(
        (promotion) => promotion.usedTimes > 0,
      );
      if (usedPromotions.length > 0) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'ids',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.translate('promotion-setting.beingUsed'),
              data: usedPromotions.map((promotion) => promotion._id),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      throw error;
    }
  }
}
