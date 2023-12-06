import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Timekeeping, TimekeepingDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class TimekeepingRepository extends BaseRepository<TimekeepingDocument> {
  constructor(
    @InjectModel(Timekeeping.name)
    model: SoftDeleteModel<TimekeepingDocument>,
  ) {
    super(model);
  }
}
