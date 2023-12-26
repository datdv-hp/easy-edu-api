import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { User } from './user.schema';
import { Course } from './course.schema';
import { Classroom } from './classroom.schema';
import { PromotionSetting } from './promotion-setting.schema';

export type PromotionUtilizationDocument =
  HydratedDocument<PromotionUtilization>;
@Schema({
  timestamps: true,
  collection: MongoCollection.PROMOTION_UTILIZATIONS,
})
export class PromotionUtilization extends MongoBaseSchema {
  id: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  studentId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Course.name,
    required: true,
  })
  courseId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Classroom.name,
    required: true,
  })
  classroomId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: PromotionSetting.name,
    required: true,
  })
  promotionId: Types.ObjectId;
}
export const PromotionUtilizationSchema =
  SchemaFactory.createForClass(PromotionUtilization);
PromotionUtilizationSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
