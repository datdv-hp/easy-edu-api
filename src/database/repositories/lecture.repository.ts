import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Lecture, LectureDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class LectureRepository extends BaseRepository<LectureDocument> {
  constructor(
    @InjectModel(Lecture.name)
    model: SoftDeleteModel<LectureDocument>,
  ) {
    super(model);
  }
}
