import { GeneralSetting, GeneralSettingSchema } from '@/database/mongo-schemas';
import { GeneralSettingRepository } from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseModule } from '../course/course.module';
import {
  CourseFormController,
  TimekeepingSettingController,
} from './controllers';
import { CourseFormService, TimekeepingSettingService } from './services';
import { CourseFormCheckUtils } from './utils/course-form-check.utils';
import { TimekeepingSettingCheckUtils } from './utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: GeneralSetting.name,
        useFactory: async () => GeneralSettingSchema,
      },
    ]),
    forwardRef(() => CourseModule),
  ],
  controllers: [CourseFormController, TimekeepingSettingController],
  providers: [
    CourseFormService,
    GeneralSettingRepository,
    CourseFormCheckUtils,
    TimekeepingSettingService,
    TimekeepingSettingCheckUtils,
  ],
  exports: [GeneralSettingRepository],
})
export class GeneralSettingModule {}
