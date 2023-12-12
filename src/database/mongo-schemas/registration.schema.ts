import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { RegistrationStatus } from '../constants';

export type RegistrationDocument = HydratedDocument<Registration>;

@Schema({ timestamps: true, collection: MongoCollection.REGISTRATIONS })
export class Registration extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: String, enum: RegistrationStatus, default: RegistrationStatus.PENDING })
  status: RegistrationStatus;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);
RegistrationSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
