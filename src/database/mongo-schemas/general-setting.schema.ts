import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { SettingType } from '../constants';
import { MongoCollection } from '@/common/constants';

export type GeneralSettingDocument = HydratedDocument<GeneralSetting>;

@Schema({ timestamps: true, collection: MongoCollection.GENERAL_SETTINGS })
export class GeneralSetting extends MongoBaseSchema {
  @Prop({ required: true, enum: SettingType })
  type: SettingType;

  @Prop({ required: true })
  value: string;
}

export const GeneralSettingSchema =
  SchemaFactory.createForClass(GeneralSetting);
GeneralSettingSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  overrideMethods: 'all',
});
