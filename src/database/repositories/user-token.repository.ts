import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, ObjectId } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { UserToken, UserTokenDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';
@Injectable()
export class UserTokenRepository extends BaseRepository<UserTokenDocument> {
  constructor(
    @InjectModel(UserToken.name)
    model: SoftDeleteModel<UserTokenDocument>,
  ) {
    super(model);
  }

  existByField(filter: FilterQuery<UserTokenDocument>) {
    return this.model.exists(filter);
  }

  softDeleteByFieldWithDeletedAt(
    filter: FilterQuery<UserTokenDocument>,
    deletedBy?: ObjectId,
  ) {
    const body = { deletedAt: dayjs().toDate(), deletedBy };
    return this.model.find(filter, body, { new: true }).lean();
  }
}
