import { DropdownController } from './dropdown.controller';
import { DropdownService } from './dropdown.service';

import { Module } from '@nestjs/common';
import { ClassroomModule } from '../classroom/classroom.module';
import { CourseModule } from '../course/course.module';
import { GeneralSettingModule } from '../general-setting/general-setting.module';
import { LessonModule } from '../lesson/lesson.module';
import { PaymentMethodSettingModule } from '../payment-method-setting/payment-method-setting.module';
import { PromotionSettingModule } from '../promotion-setting/promotion-setting.module';
import { RoleModule } from '../role/role.module';
import { SubjectModule } from '../subject/subject.module';
import { SyllabusModule } from '../syllabus/syllabus.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { UserModule } from '../user/user.module';
import { DropdownCheckUtils } from './utils/dropdown-check.utils';

@Module({
  imports: [
    CourseModule,
    UserModule,
    ClassroomModule,
    UserCourseModule,
    LessonModule,
    SubjectModule,
    RoleModule,
    CourseModule,
    GeneralSettingModule,
    SyllabusModule,
    PromotionSettingModule,
    PaymentMethodSettingModule,
  ],
  controllers: [DropdownController],
  providers: [DropdownService, DropdownCheckUtils],
})
export class DropdownModule {}
