import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { LessonAbsent, LessonAbsentDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class LessonAbsentRepository extends BaseRepository<LessonAbsentDocument> {
  constructor(
    @InjectModel(LessonAbsent.name)
    model: SoftDeleteModel<LessonAbsentDocument>,
  ) {
    super(model);
  }
}
