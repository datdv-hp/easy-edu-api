import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { GeneralSetting, GeneralSettingDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class GeneralSettingRepository extends BaseRepository<GeneralSettingDocument> {
  constructor(
    @InjectModel(GeneralSetting.name)
    model: SoftDeleteModel<GeneralSettingDocument>,
  ) {
    super(model);
  }
}
