import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Connection } from 'mongoose';
import { HttpStatus } from 'src/common/constants';
import { PromotionSettingService } from './promotion-setting.service';
import {
  promotionSettingCreateBodySchema,
  promotionSettingListFilterSchema,
  promotionUtilizationListFilterSchema,
} from './promotion-setting.validator';
import { PromotionSettingCheckUtils } from './utils/promotion-setting-check.utils';
import { promotionSettingUpdateBodySchema } from './promotion-setting.validator';
import { I18nService } from 'nestjs-i18n';
import {
  AuthorizationGuard,
  RolesGuard,
} from 'src/common/guards/authorization.guard';
import {
  IPromotionSettingListFilter,
  IPromotionUtilizationListFilter,
  IPromotionSettingCreateBody,
  IPromotionSettingUpdateBody,
} from './promotion-setting.interfaces';
import dayjs from 'dayjs';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { ObjectIdSchema, deleteManySchema } from '@/common/validations';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { IContext } from '@/common/interfaces';
import { EasyContext } from '@/common/decorators/easy-context.decorator';

@Controller('promotion')
export class PromotionSettingController {
  constructor(
    private readonly service: PromotionSettingService,
    private readonly checkUtils: PromotionSettingCheckUtils,
    private readonly i18n: I18nService,
  ) {}

  @RolesGuard(['promotionSetting.view'])
  @Get()
  async getPromotionList(
    @Query(
      new TrimBodyPipe(),
      new JoiValidationPipe(promotionSettingListFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IPromotionSettingListFilter,
  ) {
    try {
      if (query.courseIds) {
        const checkCourses = await this.checkUtils.CoursesExistByIds(
          query.courseIds,
        );
        if (!checkCourses.valid) {
          return checkCourses.error;
        }
      }
      const { items, totalItems } = await this.service.findAllAndCount(query);
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['promotionSetting.view'])
  @Get(':id/utilization')
  async getPromotionUtilizationList(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(promotionUtilizationListFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IPromotionUtilizationListFilter,
  ) {
    try {
      const checkPromotion = await this.checkUtils.PromotionExistsById(id);
      if (!checkPromotion.valid) {
        return checkPromotion.error;
      }
      const { items, totalItems } =
        await this.service.findAllPromotionUtilizationsAndCount({
          ...query,
          promotionId: id,
        });
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['promotionSetting.view'])
  @Get(':id')
  async getDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const promotion = await this.service.findDetail(id);
      if (!promotion) {
        return new ErrorResponse(
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
      }
      return new SuccessResponse(promotion);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['promotionSetting.view'])
  @Get(':id/detail')
  async getMoreDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkPromotion = await this.checkUtils.PromotionExistsById(id);
      if (!checkPromotion.valid) {
        return checkPromotion.error;
      }

      const promotion = await this.service.findMoreDetail(id);
      return new SuccessResponse(promotion);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['promotionSetting.create'])
  @Post()
  async createPromotion(
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(promotionSettingCreateBodySchema),
    )
    body: IPromotionSettingCreateBody,
    @EasyContext() ctx: IContext,
  ) {
    try {
      const checkName = await this.checkUtils.duplicatedName(body.name);
      if (!checkName.valid) {
        return checkName.error;
      }
      if (body.applyForCourseIds) {
        const checkCourses = await this.checkUtils.CoursesExistByIds(
          body.applyForCourseIds,
        );
        if (!checkCourses.valid) {
          return checkCourses.error;
        }
      }

      // move time to time 23h59 this day
      Object.assign(body, { endAt: dayjs(body.endAt).endOf('day').toDate() });
      const promotion = await this.service.create({
        ...body,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });
      return new SuccessResponse(promotion);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['promotionSetting.update'])
  @Patch(':id')
  async updatePromotion(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(promotionSettingUpdateBodySchema),
    )
    body: IPromotionSettingUpdateBody,
    @EasyContext() ctx: IContext,
  ) {
    try {
      const checkName = await this.checkUtils.duplicatedName(body.name);
      if (!checkName.valid) {
        return checkName.error;
      }
      if (body.applyForCourseIds) {
        const checkCourses = await this.checkUtils.CoursesExistByIds(
          body.applyForCourseIds,
        );
        if (!checkCourses.valid) {
          return checkCourses.error;
        }
      }

      if (body?.endAt) {
        // move time to time 23h59 this day
        Object.assign(body, { endAt: dayjs(body.endAt).endOf('day').toDate() });
      }

      const promotion = await this.service.update(id, {
        ...body,
        updatedBy: ctx.user.id,
      });
      return new SuccessResponse(promotion);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['promotionSetting.delete'])
  @Delete(':id')
  async deletePromotion(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkPromotion = await this.checkUtils.notBeUsed([id]);
      if (!checkPromotion.valid) {
        return checkPromotion.error;
      }
      await this.service.bulkDelete([id], context.user.id);
      return new SuccessResponse({ id });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['promotionSetting.delete'])
  @Delete()
  async bulkDelete(
    @Body(new JoiValidationPipe(deleteManySchema))
    ids: string[],
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkPromotions = await this.checkUtils.notBeUsed(ids);
      if (!checkPromotions.valid) {
        return checkPromotions.error;
      }
      await this.service.bulkDelete(ids, context.user.id);
      return new SuccessResponse({ ids });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
