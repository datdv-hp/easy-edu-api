import {
  PromotionSetting,
  PromotionSettingSchema,
  PromotionUtilization,
  PromotionUtilizationSchema,
} from '@/database/mongo-schemas';
import {
  PromotionSettingRepository,
  PromotionUtilizationRepository,
} from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseModule } from '../course/course.module';
import { PromotionSettingController } from './promotion-setting.controller';
import { PromotionSettingService } from './promotion-setting.service';
import { PromotionSettingCheckUtils } from './utils/promotion-setting-check.utils';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: PromotionSetting.name,
        useFactory: async () => PromotionSettingSchema,
      },
      {
        name: PromotionUtilization.name,
        useFactory: async () => PromotionUtilizationSchema,
      },
    ]),
    forwardRef(() => CourseModule),
  ],
  controllers: [PromotionSettingController],
  providers: [
    PromotionSettingRepository,
    PromotionSettingService,
    PromotionSettingCheckUtils,
    PromotionUtilizationRepository,
  ],
  exports: [PromotionUtilizationRepository, PromotionSettingRepository],
})
export class PromotionSettingModule {}
