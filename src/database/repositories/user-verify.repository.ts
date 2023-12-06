import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import {
  UserVerify,
  UserVerifyDocument,
} from '../mongo-schemas/user-verify.schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserVerifyRepository extends BaseRepository<UserVerifyDocument> {
  constructor(
    @InjectModel(UserVerify.name)
    model: SoftDeleteModel<UserVerifyDocument>,
  ) {
    super(model);
  }
}
