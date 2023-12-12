import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MongoBaseSchema } from './base.schema';
import MongooseDelete from 'mongoose-delete';
import { Course } from './course.schema';
import { MongoCollection } from '@/common/constants';
import { PromotionType } from '../constants';

export type PromotionSettingDocument = HydratedDocument<PromotionSetting>;
@Schema({ timestamps: true, collection: MongoCollection.PROMOTION_SETTINGS })
export class PromotionSetting extends MongoBaseSchema {
  id: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String, enum: PromotionType, required: true })
  type: PromotionType;

  @Prop({ type: Number, required: true })
  value: number;

  @Prop({
    type: [SchemaTypes.ObjectId],
    ref: Course.name,
    default: [],
  })
  applyForCourseIds: Types.ObjectId[];

  @Prop({ type: Number, required: true })
  times: number;

  @Prop({ type: Number, default: 0 })
  usedTimes: number;

  @Prop({ type: Date, required: true })
  startAt: Date;

  @Prop({ type: Date, required: true })
  endAt: Date;
}

export const PromotionSettingSchema =
  SchemaFactory.createForClass(PromotionSetting);
PromotionSettingSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
