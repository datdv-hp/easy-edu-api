import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import {
  TuitionPaymentHistory,
  TuitionPaymentHistoryDocument,
} from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class TuitionPaymentHistoryRepository extends BaseRepository<TuitionPaymentHistoryDocument> {
  constructor(
    @InjectModel(TuitionPaymentHistory.name)
    model: SoftDeleteModel<TuitionPaymentHistoryDocument>,
  ) {
    super(model);
  }
}
