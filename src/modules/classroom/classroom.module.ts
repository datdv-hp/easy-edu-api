import { Classroom, ClassroomSchema } from '@/database/mongo-schemas';
import { ClassroomRepository } from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseModule } from '../course/course.module';
import { LessonModule } from '../lesson/lesson.module';
import { SubjectModule } from '../subject/subject.module';
import { SyllabusModule } from '../syllabus/syllabus.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { UserModule } from '../user/user.module';
import { ClassroomController } from './classroom.controller';
import { ClassroomService } from './classroom.service';
import { ClassroomCheckUtils } from './utils/classroom-check.utils';
import { TimekeepingModule } from '../timekeeping/timekeeping.module';
import { TuitionModule } from '../tuition/tuition.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Classroom.name, useFactory: async () => ClassroomSchema },
    ]),
    forwardRef(() => SubjectModule),
    forwardRef(() => UserModule),
    forwardRef(() => SyllabusModule),
    forwardRef(() => CourseModule),
    forwardRef(() => LessonModule),
    forwardRef(() => TimekeepingModule),
    UserCourseModule,
    forwardRef(() => TuitionModule),
  ],
  controllers: [ClassroomController],
  providers: [ClassroomService, ClassroomRepository, ClassroomCheckUtils],
  exports: [ClassroomRepository],
})
export class ClassroomModule {}
