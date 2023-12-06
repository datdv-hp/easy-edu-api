import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { SyllabusHistory, SyllabusHistoryDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class SyllabusHistoryRepository extends BaseRepository<SyllabusHistoryDocument> {
  constructor(
    @InjectModel(SyllabusHistory.name)
    model: SoftDeleteModel<SyllabusHistoryDocument>,
  ) {
    super(model);
  }
}
