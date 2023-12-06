import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Subject, SubjectDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';
import dayjs from '@/plugins/dayjs';
import { CodePrefix } from '../constants';

@Injectable()
export class SubjectRepository extends BaseRepository<SubjectDocument> {
  constructor(
    @InjectModel(Subject.name)
    model: SoftDeleteModel<SubjectDocument>,
  ) {
    super(model);
  }

  findLatestSubjectOfYear(year = dayjs().year()) {
    return this.model
      .findOneWithDeleted({
        code: { $regex: `${CodePrefix.SUBJECT}${year}*`, $options: 'i' },
      })
      .sort({ _id: -1 });
  }
}
