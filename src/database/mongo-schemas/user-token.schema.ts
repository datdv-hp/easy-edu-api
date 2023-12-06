import { MongoCollection, TokenType } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { User } from './user.schema';

export type UserTokenDocument = HydratedDocument<UserToken>;
@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.USER_TOKENS,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserToken extends MongoBaseSchema {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, type: String, trim: true })
  token: string;

  @Prop({ required: true, type: String, trim: true })
  hashToken: string;

  @Prop({ type: String, enum: TokenType, required: true })
  type: TokenType;
}

export const UserTokenSchema = SchemaFactory.createForClass(UserToken);
UserTokenSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
