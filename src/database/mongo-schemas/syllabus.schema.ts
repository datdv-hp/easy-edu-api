import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';

export type SyllabusDocument = HydratedDocument<Syllabus>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.SYLLABUS,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Syllabus extends MongoBaseSchema {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  image?: string;
}

export const SyllabusSchema = SchemaFactory.createForClass(Syllabus);
SyllabusSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
