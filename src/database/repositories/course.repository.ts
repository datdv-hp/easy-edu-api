import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Course, CourseDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';
import dayjs from '@/plugins/dayjs';
import { CodePrefix } from '../constants';

@Injectable()
export class CourseRepository extends BaseRepository<CourseDocument> {
  constructor(
    @InjectModel(Course.name)
    model: SoftDeleteModel<CourseDocument>,
  ) {
    super(model);
  }

  findLatestCourseOfYear(year = dayjs().year()) {
    return this.model
      .findOneWithDeleted({
        code: { $regex: `${CodePrefix.COURSE}${year}*`, $options: 'i' },
      })
      .sort({ _id: -1 });
  }
}
