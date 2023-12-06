import { Subject, SubjectSchema } from '@/database/mongo-schemas';
import { SubjectRepository } from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassroomModule } from '../classroom/classroom.module';
import { CourseModule } from '../course/course.module';
import { LessonModule } from '../lesson/lesson.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { UserModule } from '../user/user.module';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { SubjectCheckUtils } from './utils/subject-check.utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Subject.name, useFactory: async () => SubjectSchema },
    ]),
    forwardRef(() => UserModule),
    UserCourseModule,
    forwardRef(() => ClassroomModule),
    forwardRef(() => CourseModule),
    forwardRef(() => LessonModule),
  ],
  controllers: [SubjectController],
  providers: [SubjectService, SubjectRepository, SubjectCheckUtils],
  exports: [SubjectRepository, SubjectCheckUtils],
})
export class SubjectModule {}
