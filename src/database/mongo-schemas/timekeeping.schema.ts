import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { Lesson } from './lesson.schema';
import { User } from './user.schema';

export type TimekeepingDocument = HydratedDocument<Timekeeping>;

@Schema({ timestamps: true, collection: MongoCollection.TIMEKEEPINGS })
export class Timekeeping extends MongoBaseSchema {
  @Prop({
    required: true,
    type: SchemaTypes.ObjectId,
    ref: User.name,
  })
  userId: Types.ObjectId;

  @Prop({ required: true })
  isAttended: boolean;

  @Prop({
    required: true,
    type: SchemaTypes.ObjectId,
    ref: Lesson.name,
  })
  lessonId: Types.ObjectId;
}

export const TimekeepingSchema = SchemaFactory.createForClass(Timekeeping);
TimekeepingSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
