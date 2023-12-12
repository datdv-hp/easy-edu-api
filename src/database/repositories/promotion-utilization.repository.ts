import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import {
  PromotionUtilization,
  PromotionUtilizationDocument,
} from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class PromotionUtilizationRepository extends BaseRepository<PromotionUtilizationDocument> {
  constructor(
    @InjectModel(PromotionUtilization.name)
    model: SoftDeleteModel<PromotionUtilizationDocument>,
  ) {
    super(model);
  }
}
