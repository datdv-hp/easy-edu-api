import { Module, forwardRef } from '@nestjs/common';
import { TuitionController } from './tuition.controller';
import { TuitionService } from './tuition.service';
import { TuitionCheckUtils } from './utils/tuition-check.utils';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Tuition,
  TuitionPaymentHistory,
  TuitionPaymentHistorySchema,
  TuitionSchema,
} from '@/database/mongo-schemas';
import {
  TuitionPaymentHistoryRepository,
  TuitionRepository,
} from '@/database/repositories';
import { UserModule } from '../user/user.module';
import { ClassroomModule } from '../classroom/classroom.module';
import { PromotionSettingModule } from '../promotion-setting/promotion-setting.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Tuition.name, useFactory: async () => TuitionSchema },
      {
        name: TuitionPaymentHistory.name,
        useFactory: async () => TuitionPaymentHistorySchema,
      },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => ClassroomModule),
    forwardRef(() => PromotionSettingModule),
  ],
  controllers: [TuitionController],
  providers: [
    TuitionService,
    TuitionRepository,
    TuitionPaymentHistoryRepository,
    TuitionCheckUtils,
  ],
  exports: [TuitionRepository, TuitionPaymentHistoryRepository],
})
export class TuitionModule {}
