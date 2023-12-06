import { Prop } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
export class MongoBaseSchema {
  _id: Types.ObjectId;

  @Prop({ required: false, default: null, type: Date })
  createdAt: Date;

  @Prop({ required: false, default: null, type: Date })
  updatedAt: Date;

  @Prop({ required: false, default: null, type: Date })
  deletedAt?: Date;

  @Prop({ required: false, default: null, type: SchemaTypes.ObjectId })
  deletedBy?: Types.ObjectId;

  @Prop({ required: false, default: null, type: SchemaTypes.ObjectId })
  updatedBy: Types.ObjectId;

  @Prop({ required: false, type: SchemaTypes.ObjectId })
  createdBy: Types.ObjectId;
}

/**
 * The sample of schema
import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MongoBaseSchema } from './base.schema';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.USERS,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class User extends MongoBaseSchema {

}

export const UserSchema = SchemaFactory.createForClass(User);
 */
