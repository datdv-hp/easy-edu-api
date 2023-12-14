import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { PaymentMethodSetting } from '@/database/mongo-schemas';
import { PaymentMethodSettingRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { difference } from 'lodash';
import { ProjectionType } from 'mongoose';
import { HttpStatus } from 'src/common/constants';

@Injectable()
export class PaymentMethodSettingCheckUtils extends BaseService {
  constructor(
    private readonly repo: PaymentMethodSettingRepository,
    protected readonly configService: ConfigService,
  ) {
    super(PaymentMethodSettingCheckUtils.name, configService);
  }

  async duplicatedName(name: string) {
    try {
      const existedMethod = await this.repo
        .findOne({ name }, { _id: 1 })
        .lean()
        .exec();
      if (existedMethod) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'name',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate(
                'payment-method-setting.duplicatedName',
              ),
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

  async existedByIds(ids: string[]) {
    try {
      const existedMethods = await this.repo
        .find({ _id: { $in: ids } }, { _id: 1 })
        .lean()
        .exec();
      if (existedMethods.length !== ids.length) {
        const existedMethodIds = existedMethods.map((method) =>
          method._id.toString(),
        );
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('payment-method-setting.notFound'),
              data: difference(existedMethodIds, ids),
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

  async existedById(
    id: string,
    select: ProjectionType<PaymentMethodSetting> = { _id: 1 },
  ) {
    try {
      const existedMethod = await this.repo.findById(id, select).lean().exec();
      if (!existedMethod) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('payment-method-setting.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedMethod };
    } catch (error) {
      throw error;
    }
  }
}
