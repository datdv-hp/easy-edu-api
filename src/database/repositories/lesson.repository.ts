import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Lesson, LessonDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';
import dayjs from '@/plugins/dayjs';
import { CodePrefix } from '../constants';
@Injectable()
export class LessonRepository extends BaseRepository<LessonDocument> {
  constructor(
    @InjectModel(Lesson.name)
    model: SoftDeleteModel<LessonDocument>,
  ) {
    super(model);
  }

  findLatestLessonOfYear(year = dayjs().year()) {
    return this.model
      .findOneWithDeleted({
        code: { $regex: `${CodePrefix.LESSON}${year}*`, $options: 'i' },
      })
      .sort({ _id: -1 });
  }
}
