import { MongoCollection } from '@/common/constants';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { MongoBaseSchema } from './base.schema';
import { Syllabus } from './syllabus.schema';

export type SyllabusHistoryDocument = HydratedDocument<SyllabusHistory>;

@Schema({
  timestamps: true,
  id: true,
  collection: MongoCollection.SYLLABUS_HISTORY_EDITS,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class SyllabusHistory extends MongoBaseSchema {
  @Prop({ type: SchemaTypes.ObjectId, ref: Syllabus.name, required: true })
  syllabusId: Types.ObjectId;

  @Prop({ type: String, required: true })
  note: string;
}

export const SyllabusHistorySchema =
  SchemaFactory.createForClass(SyllabusHistory);
SyllabusHistorySchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedAt: true,
  overrideMethods: 'all',
});
