import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { UserVerifyType } from '../constants';
import { MongoBaseSchema } from './base.schema';
import { User } from './user.schema';

export type UserVerifyDocument = HydratedDocument<UserVerify>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.USER_VERIFIES,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class UserVerify extends MongoBaseSchema {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: () => UserVerifyType, required: true })
  type: UserVerifyType;
}

export const UserVerifySchema = SchemaFactory.createForClass(UserVerify);
UserVerifySchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
