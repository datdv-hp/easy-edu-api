import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { MimeType } from '../constants';
import { MongoBaseSchema } from './base.schema';
import MongooseDelete from 'mongoose-delete';

export type LectureDocument = HydratedDocument<Lecture>;

export class DocumentFile {
  @Prop({ required: true })
  link: string;

  @Prop({ required: true })
  mimeType: MimeType;

  @Prop({ required: true })
  name: string;
}

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.LECTURES,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Lecture extends MongoBaseSchema {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: MongoCollection.SYLLABUS,
  })
  syllabusId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: () => [{ type: DocumentFile }], required: false })
  files: DocumentFile[];

  @Prop({ required: false })
  referenceLinks: string[];
}

export const LectureSchema = SchemaFactory.createForClass(Lecture);
LectureSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
