import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import {
  PaymentMethodSetting,
  PaymentMethodSettingDocument,
} from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class PaymentMethodSettingRepository extends BaseRepository<PaymentMethodSettingDocument> {
  constructor(
    @InjectModel(PaymentMethodSetting.name)
    model: SoftDeleteModel<PaymentMethodSettingDocument>,
  ) {
    super(model);
  }
}
