import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';

export type SubjectDocument = HydratedDocument<Subject>;

@Schema({ _id: false })
export class Document {
  @Prop()
  name: string;

  @Prop()
  link: string;
}

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.SUBJECTS,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Subject extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  subjectCode: string;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: () => [{ type: Document }] })
  documents?: Document[];
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
SubjectSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
