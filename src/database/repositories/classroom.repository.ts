import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Classroom, ClassroomDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';
import dayjs from '@/plugins/dayjs';
import { CodePrefix } from '../constants';

@Injectable()
export class ClassroomRepository extends BaseRepository<ClassroomDocument> {
  constructor(
    @InjectModel(Classroom.name)
    model: SoftDeleteModel<ClassroomDocument>,
  ) {
    super(model);
  }

  findLatestClassroomOfYear(year = dayjs().year()) {
    return this.model
      .findOneWithDeleted({
        code: { $regex: `${CodePrefix.CLASSROOM}${year}*`, $options: 'i' },
      })
      .sort({ _id: -1 });
  }
}
