import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import {
  EvaluationCriteria,
  EvaluationCriteriaDocument,
} from '../mongo-schemas';
import { BaseRepository } from './base.repository';

@Injectable()
export class EvaluationCriteriaRepository extends BaseRepository<EvaluationCriteriaDocument> {
  constructor(
    @InjectModel(EvaluationCriteria.name)
    model: SoftDeleteModel<EvaluationCriteriaDocument>,
  ) {
    super(model);
  }
}
