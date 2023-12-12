import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { MongoBaseSchema } from './base.schema';
import { Course } from './course.schema';
import { Subject } from './subject.schema';
import { User } from './user.schema';
import MongooseDelete from 'mongoose-delete';

export type UserCourseDocument = HydratedDocument<UserCourse>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.USER_COURSES,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserCourse extends MongoBaseSchema {
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: Course.name, required: true })
  courseId: Types.ObjectId;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: Subject.name }] })
  subjectIds?: Types.ObjectId[];
}

export const UserCourseSchema = SchemaFactory.createForClass(UserCourse);
UserCourseSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
UserCourseSchema.index(
  {
    userId: 1,
    courseId: 1,
  },
  { unique: true },
);
