import { CourseRepository } from '@/database/repositories';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';

import { Course, CourseSchema } from '@/database/mongo-schemas';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassroomModule } from '../classroom/classroom.module';
import { GeneralSettingModule } from '../general-setting/general-setting.module';
import { EvaluationCriteriaModule } from '../evaluation-criteria-setting/evaluation-criteria.module';
import { LessonModule } from '../lesson/lesson.module';
import { SubjectModule } from '../subject/subject.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { CourseCheckUtils } from './utils/course-check.utils';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Course.name, useFactory: async () => CourseSchema },
    ]),
    UserCourseModule,
    forwardRef(() => UserModule),
    forwardRef(() => ClassroomModule),
    forwardRef(() => SubjectModule),
    forwardRef(() => GeneralSettingModule),
    forwardRef(() => LessonModule),
    EvaluationCriteriaModule,
  ],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository, CourseCheckUtils],
  exports: [CourseRepository],
})
export class CourseModule {}
