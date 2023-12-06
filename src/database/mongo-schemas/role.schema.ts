import { MongoCollection, RoleType } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MongoBaseSchema } from './base.schema';
import MongooseDelete from 'mongoose-delete';

export type RoleDocument = HydratedDocument<Role>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.ROLES,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Role extends MongoBaseSchema {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true })
  features: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Boolean })
  isMaster?: boolean;

  @Prop({ type: Boolean })
  isDefault?: boolean;

  @Prop({ type: String, enum: RoleType, required: true })
  type: RoleType;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
RoleSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
