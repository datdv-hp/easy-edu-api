import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { Syllabus, SyllabusDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class SyllabusRepository extends BaseRepository<SyllabusDocument> {
  constructor(
    @InjectModel(Syllabus.name)
    model: SoftDeleteModel<SyllabusDocument>,
  ) {
    super(model);
  }
}
