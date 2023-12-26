import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery } from 'mongoose';
import { BaseService } from 'src/common/services/base.service';
import { PaymentMethodSettingRepository } from 'src/database/repositories';
import {
  IPaymentMethodFilter,
  IPaymentMethodSettingCreateBody,
  IPaymentMethodSettingUpdateBody,
} from './payment-method-setting.interfaces';
import { PaymentMethodSetting } from '@/database/mongo-schemas';
import { stos } from '@/common/helpers/common.functions.helper';

@Injectable()
export class PaymentMethodSettingService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: PaymentMethodSettingRepository,
  ) {
    super(PaymentMethodSettingService.name, configService);
  }

  async create(
    params: IPaymentMethodSettingCreateBody & {
      updatedBy: string;
      createdBy: string;
    },
  ) {
    try {
      const newPaymentMethod = await this.repo.create(params);
      return newPaymentMethod;
    } catch (error) {
      this.logger.error('Error in create service: ', error);
      throw error;
    }
  }

  async findAllAndCount(params: IPaymentMethodFilter) {
    try {
      const { limit, skip, orderDirection, orderBy } = params;
      const sort = { [orderBy]: orderDirection };

      const filter: FilterQuery<PaymentMethodSetting> = {};
      if (params.keyword) {
        filter.name = { $regex: params.keyword, $options: 'i' };
      }
      const [items, totalItems] = await Promise.all([
        this.repo
          .find(filter, ['name'])
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.repo.model.countDocuments(filter).lean().exec(),
      ]);
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllAndCount service: ', error);
      throw error;
    }
  }

  async getDetail(id: string) {
    try {
      const paymentMethod = await this.repo
        .findById(id, ['name'])
        .lean()
        .exec();
      return paymentMethod;
    } catch (error) {
      this.logger.error('Error in getDetail service: ', error);
      throw error;
    }
  }

  async update(
    id: string,
    params: IPaymentMethodSettingUpdateBody & {
      updatedBy: string;
    },
  ) {
    try {
      const paymentMethod = await this.repo
        .findByIdAndUpdate(id, params)
        .lean()
        .exec();
      return paymentMethod;
    } catch (error) {
      this.logger.error('Error in update service: ', error);
      throw error;
    }
  }

  async bulkDelete(_ids: string[], deletedBy: string) {
    const session = await this.repo.model.startSession();
    try {
      session.startTransaction();
      const ids = stos(_ids);
      await this.repo.delete({ _id: { $in: ids } }, deletedBy).session(session);
      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();

      this.logger.error('Error in bulkDelete service: ', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
