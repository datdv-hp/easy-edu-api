import { UserType } from '@/common/constants';
import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { CodePrefix } from '../constants';
import { User, UserDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends BaseRepository<UserDocument> {
  constructor(
    @InjectModel(User.name)
    model: SoftDeleteModel<UserDocument>,
  ) {
    super(model);
  }

  findLatestUserOfYear(
    type: UserType.STUDENT | UserType.TEACHER,
    year = dayjs().year(),
  ) {
    return this.model
      .findOneWithDeleted({
        code: { $regex: `${CodePrefix[type]}${year}*`, $options: 'i' },
      })
      .sort({ _id: -1 });
  }
}
