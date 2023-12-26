import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { AbsentRequestStatus } from '../constants';
import { MongoBaseSchema } from './base.schema';
import { Lesson } from './lesson.schema';
import { User } from './user.schema';

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
