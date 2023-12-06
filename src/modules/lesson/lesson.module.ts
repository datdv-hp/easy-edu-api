import {
  Lesson,
  LessonAbsent,
  LessonAbsentSchema,
  LessonSchema,
} from '@/database/mongo-schemas';
import {
  LessonAbsentRepository,
  LessonRepository,
} from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassroomModule } from '../classroom/classroom.module';
import { CourseModule } from '../course/course.module';
import { ExternalSystemsModule } from '../external-systems/external-systems.module';
import { MailModule } from '../mail/mail.module';
import { SubjectModule } from '../subject/subject.module';
import { SyllabusModule } from '../syllabus/syllabus.module';
import { TimekeepingModule } from '../timekeeping/timekeeping.module';
import { UserModule } from '../user/user.module';
import { LessonAbsentService } from './lesson-absent.service';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { LessonCheckUtils } from './utils/lesson-check.utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Lesson.name, useFactory: () => LessonSchema },
      { name: LessonAbsent.name, useFactory: () => LessonAbsentSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => ClassroomModule),
    forwardRef(() => SubjectModule),
    forwardRef(() => SyllabusModule),
    forwardRef(() => CourseModule),
    forwardRef(() => TimekeepingModule),
    MailModule,
    ExternalSystemsModule,
  ],
  controllers: [LessonController],
  providers: [
    LessonService,
    LessonRepository,
    LessonAbsentRepository,
    LessonCheckUtils,
    LessonAbsentService,
  ],
  exports: [LessonRepository, LessonAbsentRepository],
})
export class LessonModule {}
