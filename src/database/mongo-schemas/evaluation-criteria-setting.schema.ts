import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MongoBaseSchema } from './base.schema';
import { HydratedDocument } from 'mongoose';
import { CriteriaType, EvaluationCriteriaStatus } from '../constants';
import MongooseDelete from 'mongoose-delete';

export type EvaluationCriteriaDocument = HydratedDocument<EvaluationCriteria>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.EVALUATION_CRITERIA_SETTINGS,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class EvaluationCriteria extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, enum: EvaluationCriteriaStatus })
  status: EvaluationCriteriaStatus;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: true, enum: CriteriaType })
  type: CriteriaType;
}

export const EvaluationCriteriaSchema =
  SchemaFactory.createForClass(EvaluationCriteria);
EvaluationCriteriaSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
