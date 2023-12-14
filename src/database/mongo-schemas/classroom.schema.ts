import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { MongoBaseSchema } from './base.schema';
import { Course } from './course.schema';
import { Syllabus } from './syllabus.schema';
import { User } from './user.schema';
import MongooseDelete from 'mongoose-delete';

export type ClassroomDocument = HydratedDocument<Classroom>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.CLASSROOMS,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Classroom extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: Course.name })
  courseId: Types.ObjectId;

  @Prop({ type: String, required: true })
  startDate: string;

  @Prop({ type: String, required: true })
  endDate: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: User.name }] })
  participantIds: Types.ObjectId[];

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: User.name }] })
  teacherIds: Types.ObjectId[];

  @Prop({ type: String, match: /^#(?:[0-9a-fA-F]{3}){1,2}$/ })
  color: string; // Hex color ex: #ffffff

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: Syllabus.name }] })
  syllabusIds: Types.ObjectId[];

  @Prop({ type: Date, required: true })
  paymentStartDate: Date;

  @Prop({ type: Date, required: true })
  paymentEndDate: Date;
}

export const ClassroomSchema = SchemaFactory.createForClass(Classroom);
ClassroomSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
