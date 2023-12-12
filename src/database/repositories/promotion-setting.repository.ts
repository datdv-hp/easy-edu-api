import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { PromotionSetting, PromotionSettingDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class PromotionSettingRepository extends BaseRepository<PromotionSettingDocument> {
  constructor(
    @InjectModel(PromotionSetting.name)
    model: SoftDeleteModel<PromotionSettingDocument>,
  ) {
    super(model);
  }
}
