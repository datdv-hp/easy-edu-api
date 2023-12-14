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
import {
  IPaymentMethodFilter,
  IPaymentMethodSettingCreateBody,
  IPaymentMethodSettingUpdateBody,
} from './payment-method-setting.interfaces';
import {
  paymentMethodFilterSchema,
  paymentMethodSettingCreateBodySchema,
  paymentMethodSettingUpdateBodySchema,
} from './payment-method-setting.validator';
import { PaymentMethodSettingCheckUtils } from './utils/payment-method-setting-check.utils';
import { PaymentMethodSettingService } from './payment-method-setting.service';
import {
  AuthorizationGuard,
  RolesGuard,
} from 'src/common/guards/authorization.guard';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { IContext } from '@/common/interfaces';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { ObjectIdSchema, deleteManySchema } from '@/common/validations';

@UseGuards(AuthorizationGuard)
@Controller('payment-method')
export class PaymentMethodSettingController {
  constructor(
    private readonly checkUtils: PaymentMethodSettingCheckUtils,
    private readonly service: PaymentMethodSettingService,
  ) {}

  @RolesGuard(['paymentMethodSetting.create'])
  @Post()
  async create(
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(paymentMethodSettingCreateBodySchema),
    )
    body: IPaymentMethodSettingCreateBody,
    @EasyContext() context: IContext,
  ) {
    try {
      const checkDuplicatedName = await this.checkUtils.duplicatedName(
        body.name,
      );
      if (!checkDuplicatedName.valid) return checkDuplicatedName.error;

      const newPaymentMethod = await this.service.create({
        ...body,
        createdBy: context.user.id,
        updatedBy: context.user.id,
      });
      return new SuccessResponse(newPaymentMethod);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['paymentMethodSetting.view'])
  @Get()
  async getList(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(paymentMethodFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IPaymentMethodFilter,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllAndCount(query);
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['paymentMethodSetting.view'])
  @Get(':id')
  async getDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkPaymentMethod = await this.checkUtils.existedById(id, [
        'name',
      ]);
      if (!checkPaymentMethod.valid) return checkPaymentMethod.error;

      return new SuccessResponse(checkPaymentMethod.data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['paymentMethodSetting.update'])
  @Patch(':id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(paymentMethodSettingUpdateBodySchema),
    )
    body: IPaymentMethodSettingUpdateBody,
    @EasyContext() context: IContext,
  ) {
    try {
      const checkExisted = await this.checkUtils.existedById(id);
      if (!checkExisted.valid) return checkExisted.error;

      const checkDuplicatedName = await this.checkUtils.duplicatedName(
        body.name,
      );
      if (!checkDuplicatedName.valid) return checkDuplicatedName.error;

      const newPaymentMethod = await this.service.update(id, {
        ...body,
        updatedBy: context.user.id,
      });
      return new SuccessResponse(newPaymentMethod);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['paymentMethodSetting.delete'])
  @Delete()
  async deleteMany(
    @Body(new JoiValidationPipe(deleteManySchema))
    ids: string[],
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedMany = await this.checkUtils.existedByIds(ids);
      if (!checkExistedMany.valid) return checkExistedMany.error;

      await this.service.bulkDelete(ids, context.user.id);
      return new SuccessResponse({ ids });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
