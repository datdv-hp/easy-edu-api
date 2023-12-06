import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { Classroom } from './classroom.schema';
import { Course } from './course.schema';
import { Lecture } from './lecture.schema';
import { Subject } from './subject.schema';
import { Syllabus } from './syllabus.schema';
import { User } from './user.schema';

export type LessonDocument = HydratedDocument<Lesson>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.LESSONS,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Lesson extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({
    required: true,
    type: SchemaTypes.ObjectId,
    ref: Classroom.name,
  })
  classroomId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Subject.name,
  })
  subjectId?: Types.ObjectId;

  @Prop({
    required: true,
    type: SchemaTypes.ObjectId,
    ref: User.name,
  })
  teacherId: Types.ObjectId;

  @Prop({
    required: true,
    type: [{ type: SchemaTypes.ObjectId, ref: User.name }],
  })
  studentIds?: Types.ObjectId[];

  @Prop({
    required: true,
    type: SchemaTypes.ObjectId,
    ref: Course.name,
  })
  courseId: Types.ObjectId;

  @Prop({ type: String })
  room?: string;

  @Prop({ type: String, default: null })
  meetUrl?: string;

  @Prop({ type: Boolean, default: false })
  isUseGoogleMeet?: boolean;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: String, required: true })
  date: string;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: String, required: true })
  endTime: string;

  @Prop({ type: [{ type: String }], default: [] })
  documents?: string[];

  @Prop({ type: [{ type: String }], default: [] })
  recordings?: string[];

  @Prop({
    type: [{ type: SchemaTypes.ObjectId, ref: Lecture.name }],
    default: [],
  })
  lectureIds?: Types.ObjectId[];

  @Prop({ type: SchemaTypes.ObjectId, ref: Syllabus.name, default: null })
  syllabusId?: Types.ObjectId;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
LessonSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
