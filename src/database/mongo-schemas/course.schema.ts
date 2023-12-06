import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { MongoBaseSchema } from './base.schema';
import { Subject } from './subject.schema';
import MongooseDelete from 'mongoose-delete';
import { GeneralSetting } from './general-setting.schema';

export type CourseDocument = HydratedDocument<Course>;
@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.COURSES,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Course extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: Subject.name }] })
  subjectIds?: Types.ObjectId[];

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: GeneralSetting.name }] })
  courseFormIds: Types.ObjectId[];

  @Prop({ type: Number, required: true, default: 0 })
  times: number;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
CourseSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
