import {
  Gender,
  MongoCollection,
  UserRole,
  UserStatus,
  UserType,
} from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { StudentDegree } from '../constants';
import { MongoBaseSchema } from './base.schema';
import { Role } from './role.schema';
import { Subject } from './subject.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
class StudentDetail {
  @Prop({ type: String, enum: StudentDegree })
  degree: StudentDegree;
}

class ManagerDetail {
  @Prop({ type: String })
  signedContractDate?: string;
}

@Schema({ _id: false })
class TeacherDetail {
  // need fix evaluation
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: Subject.name }] })
  subjectIds?: Types.ObjectId[];

  @Prop({ type: String, trim: true, default: null })
  degree?: string;

  @Prop({ type: String, trim: true, default: null })
  // đơn vị công tác
  workUnit?: string;

  @Prop({ type: String, default: null })
  // ngày ký hợp đồng
  signedContractDate?: string;

  @Prop({ type: String, trim: true, default: null })
  note?: string;

  @Prop({ type: String, trim: true, default: null })
  identity?: string;

  @Prop({ type: String, trim: true, default: null })
  nationality?: string;
}

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.USERS,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User extends MongoBaseSchema {
  @Prop({ type: String, trim: true })
  code: string;

  @Prop({ type: String, trim: true, default: null })
  avatar: string;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, trim: true })
  email: string;

  @Prop({ type: String, trim: true, default: null })
  phone: string;

  @Prop({ type: String, default: null })
  password: string;

  @Prop({ type: Boolean, default: true })
  isTemporary: boolean;

  @Prop({ type: String, default: null })
  dob: string;

  @Prop({ type: String, enum: Gender, default: null })
  gender: Gender;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.CONFIRMING,
    index: true,
  })
  status: UserStatus;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  userRole: UserRole;

  @Prop({ type: String, enum: UserType, default: UserType.NONE })
  type: UserType;

  @Prop({ type: ManagerDetail })
  managerDetail?: ManagerDetail;

  @Prop({ type: TeacherDetail })
  teacherDetail?: TeacherDetail;

  @Prop({ type: StudentDetail })
  studentDetail?: StudentDetail;

  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: Role.name })
  roleId: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
