import { MongoCollection } from '@/common/constants';
import { TuitionStatus } from '@/modules/tuition/tuition.constant';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { PromotionType } from '../constants';
import { MongoBaseSchema } from './base.schema';
import { Classroom } from './classroom.schema';
import { Course } from './course.schema';
import { User } from './user.schema';

export type TuitionDocument = HydratedDocument<Tuition>;

export class TuitionPromotionInfo extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  value: number;

  @Prop({ type: Number, required: true })
  finalValue: number;

  @Prop({ type: Number, required: true })
  type: PromotionType;

  @Prop({ type: Number, required: true })
  priority: number;
}

@Schema({
  timestamps: true,
  collection: MongoCollection.TUITIONS,
})
export class Tuition extends MongoBaseSchema {
  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    ref: Classroom.name,
  })
  classroomId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    ref: Course.name,
  })
  courseId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  originalValue: number;

  @Prop({ type: () => [TuitionPromotionInfo], default: [] })
  promotions: TuitionPromotionInfo[];

  @Prop({ type: Number, default: 0 })
  promotionValue: number;

  @Prop({ type: Number, required: true })
  payValue: number;

  @Prop({ type: Number, default: 0 })
  paidValue: number;

  @Prop({ type: Number, required: true })
  shortageValue: number;

  @Prop({ type: Date, required: true })
  paymentStartDate: Date;

  @Prop({ type: Date, required: true })
  paymentEndDate: Date;

  @Prop({ default: TuitionStatus.NOT_PAID })
  status: TuitionStatus;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
    default: null,
  })
  presenterId: Types.ObjectId;
}

export const TuitionSchema = SchemaFactory.createForClass(Tuition);

TuitionSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
