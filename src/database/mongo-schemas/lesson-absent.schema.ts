import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { User } from './user.schema';
import { Lesson } from './lesson.schema';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { MongoCollection } from '@/common/constants';
import { AbsentRequestStatus } from '../constants';

export type LessonAbsentDocument = HydratedDocument<LessonAbsent>;

@Schema({ timestamps: true, collection: MongoCollection.LESSON_ABSENTS })
export class LessonAbsent extends MongoBaseSchema {
  id: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    ref: User.name,
  })
  userId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    ref: Lesson.name,
  })
  lessonId: Types.ObjectId;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({
    type: String,
    enum: AbsentRequestStatus,
    default: AbsentRequestStatus.PROCESSING,
  })
  status: AbsentRequestStatus;
}

export const LessonAbsentSchema = SchemaFactory.createForClass(LessonAbsent);

LessonAbsentSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
