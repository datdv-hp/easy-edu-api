import {
  EvaluationCriteria,
  EvaluationCriteriaSchema,
} from '@/database/mongo-schemas';
import { EvaluationCriteriaRepository } from '@/database/repositories';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: EvaluationCriteria.name,
        useFactory: async () => EvaluationCriteriaSchema,
      },
    ]),
  ],
  controllers: [],
  providers: [EvaluationCriteriaRepository],
  exports: [EvaluationCriteriaRepository],
})
export class EvaluationCriteriaModule {}
