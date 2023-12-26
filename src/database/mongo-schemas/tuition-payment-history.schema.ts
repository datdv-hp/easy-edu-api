import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { PaymentMethodSetting } from './payment-method-setting.schema';
import { Tuition } from './tuition.schema';

export type TuitionPaymentHistoryDocument =
  HydratedDocument<TuitionPaymentHistory>;

@Schema({
  timestamps: true,
  collection: MongoCollection.TUITION_PAYMENT_HISTORIES,
})
export class TuitionPaymentHistory extends MongoBaseSchema {
  @Prop({
    required: true,
    type: SchemaTypes.ObjectId,
    ref: Tuition.name,
  })
  tuitionId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  value: number;

  // get id from setting payment method
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    ref: PaymentMethodSetting.name,
  })
  paymentMethodId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  paymentDate: Date;
}

export const TuitionPaymentHistorySchema = SchemaFactory.createForClass(
  TuitionPaymentHistory,
);
TuitionPaymentHistorySchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
