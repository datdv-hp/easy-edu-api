import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import {
  UserCourse,
  UserCourseDocument,
} from '../mongo-schemas/user-course.schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserCourseRepository extends BaseRepository<UserCourseDocument> {
  constructor(
    @InjectModel(UserCourse.name)
    model: SoftDeleteModel<UserCourseDocument>,
  ) {
    super(model);
  }
}
