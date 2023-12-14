import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoCollection } from '@/common/constants';
import { MongoBaseSchema } from './base.schema';

export type PaymentMethodSettingDocument =
  HydratedDocument<PaymentMethodSetting>;
@Schema({
  timestamps: true,
  collection: MongoCollection.PAYMENT_METHOD_SETTINGS,
})
export class PaymentMethodSetting extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;
}
export const PaymentMethodSettingSchema =
  SchemaFactory.createForClass(PaymentMethodSetting);
PaymentMethodSettingSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
