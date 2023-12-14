import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { HttpStatus, RoleType } from 'src/common/constants';
import {
  IFilterTuitionList,
  IFilterTuitionPaymentHistory,
  ITuitionPaymentBody,
  IUpdateTuitionInfoBody,
} from './tuition.interface';
import { TuitionService } from './tuition.service';
import {
  FilterInfoTuitionStudentSchema,
  FilterTuitionPaymentHistorySchema,
  TuitionPaymentBodySchema,
  UpdateTuitionInfoBodySchema,
} from './tuition.validator';
import { TuitionCheckUtils } from './utils/tuition-check.utils';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { IContext } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ObjectIdSchema } from '@/common/validations';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { TuitionStatus } from './tuition.constant';
import { RolesGuard } from '@/common/guards/authorization.guard';

@Controller('tuition')
export class TuitionController {
  constructor(
    private readonly tuitionService: TuitionService,
    private readonly i18n: I18nService,
    private readonly checkUtils: TuitionCheckUtils,
  ) {}

  @RolesGuard(['tuition.view', 'tuition.viewPersonal'])
  @Get()
  async getAllAndCountInfoFeeStudentInClassroom(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(FilterInfoTuitionStudentSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IFilterTuitionList,
    @EasyContext() context: IContext,
  ) {
    try {
      // validate classroom
      if (query?.classroomIds) {
        const checkClassrooms = await this.checkUtils.existedClassrooms(
          query.classroomIds,
        );
        if (!checkClassrooms.valid) return checkClassrooms.error;
      }

      // validate presenter
      if (query?.presenterIds) {
        const checkPresenters = await this.checkUtils.existedPresenters(
          query.presenterIds,
        );
        if (!checkPresenters.valid) return checkPresenters.error;
      }
      let userIds: string[];
      console.log('roleType', context.roleType);
      if (context.roleType === RoleType.STUDENT) {
        userIds = [context.user.id];
      }

      const [result, total] = await this.tuitionService.findAllAndCount(
        query,
        userIds,
      );

      return new SuccessResponse({
        items: result,
        totalItems: total,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['tuition.update'])
  @Patch(':id')
  async updateTuitionInfo(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(UpdateTuitionInfoBodySchema),
    )
    body: IUpdateTuitionInfoBody,
    @EasyContext() context: IContext,
  ) {
    try {
      const checkExistedTuition = await this.checkUtils.existedTuition(id, {
        paidValue: 1,
        originalValue: 1,
        promotions: 1,
        userId: 1,
        classroomId: 1,
        courseId: 1,
      });
      if (!checkExistedTuition.valid) return checkExistedTuition.error;

      const existedTuition = checkExistedTuition.data;
      const newPromotionsMapObject = {};
      let oldPromotionIds: string[];
      if (body.promotions) {
        if (existedTuition.paidValue) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('errors.400'),
            [
              {
                key: 'promotions',
                errorCode: HttpStatus.ITEM_INVALID,
                message: 'tuition.canNotChangePromotions',
              },
            ],
          );
        }
        const promotionIds = body.promotions.map((item) => {
          newPromotionsMapObject[item.id] = {
            priority: item.priority,
          };
          return item.id;
        });
        if (promotionIds.length) {
          const checkExistedPromotions =
            await this.checkUtils.existedPromotions(promotionIds, {
              name: 1,
              value: 1,
              type: 1,
            });
          if (!checkExistedPromotions.valid)
            return checkExistedPromotions.error;
          checkExistedPromotions.data.forEach((item) => {
            const id = item._id.toString();
            Object.assign(newPromotionsMapObject[id], {
              id: item._id,
              name: item.name,
              value: item.value,
              type: item.type,
            });
          });
        }
        oldPromotionIds = existedTuition.promotions.map((item) =>
          item._id.toString(),
        );
      }
      await this.tuitionService.updateTuitionInfo(
        {
          id,
          originalValue: existedTuition.originalValue,
          classroomId: existedTuition.classroomId,
          courseId: existedTuition.courseId,
          userId: existedTuition.userId,
        },
        { ...body, updatedBy: context.user.id, oldPromotionIds },
        newPromotionsMapObject,
      );
      return new SuccessResponse({ id });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['tuition.view', 'tuition.viewPersonal'])
  @Get(':id')
  async getDetailBasicInfoFeeOfStudent(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkExistedTuition = await this.checkUtils.existedTuition(id);
      if (!checkExistedTuition.valid) return checkExistedTuition.error;
      const result = await this.tuitionService.getDetailBasicInfoFeeOfStudent(
        id,
      );

      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['tuition.update'])
  @Get(':id/payment-info')
  async getPaymentInfoOfStudent(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkExistedTuition = await this.checkUtils.existedTuition(id, {
        payValue: 1,
        paidValue: 1,
        shortageValue: 1,
      });
      if (!checkExistedTuition.valid) return checkExistedTuition.error;

      return new SuccessResponse(checkExistedTuition.data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['tuition.view', 'tuition.viewPersonal'])
  @Get(':id/payment-history')
  async getPaymentHistoryOfStudent(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(FilterTuitionPaymentHistorySchema),
      new ModifyFilterQueryPipe(),
    )
    query: IFilterTuitionPaymentHistory,
  ) {
    try {
      const checkExistedTuition = await this.checkUtils.existedTuition(id);
      if (!checkExistedTuition.valid) return checkExistedTuition.error;
      const { items, totalItems } =
        await this.tuitionService.findAllTuitionPaymentAndCount(id, query);
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['tuition.update'])
  @Post(':id/payment')
  async createTuitionPayment(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(TuitionPaymentBodySchema))
    body: ITuitionPaymentBody,
    @EasyContext() context: IContext,
  ) {
    try {
      const checkExistedTuition = await this.checkUtils.existedTuition(id, {
        shortageValue: 1,
        status: 1,
      });
      const hasCompletedPayment =
        checkExistedTuition.data.status === TuitionStatus.COMPLETED;
      if (hasCompletedPayment) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'value',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.translate(
                'tuition.paymentHasAlreadyCompleted',
              ),
            },
          ],
        );
      }
      const shortageValue = checkExistedTuition.data.shortageValue;
      if (body.value > shortageValue) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'value',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.translate('tuition.exceedPaymentValue', {
                args: { shortageValue },
              }),
            },
          ],
        );
      }
      if (!checkExistedTuition.valid) return checkExistedTuition.error;
      const tuitionInfo = {
        id: checkExistedTuition.data._id,
        shortageValue: checkExistedTuition.data.shortageValue,
      };
      const success = await this.tuitionService.createTuitionPayment(
        tuitionInfo,
        {
          ...body,
          updatedBy: context.user.id,
          createdBy: context.user.id,
        },
      );
      return new SuccessResponse({ success });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
