import { SyllabusService } from './services/syllabus.service';
import { SyllabusController } from './controllers/syllabus.controller';
import {
  Lecture,
  LectureSchema,
  Syllabus,
  SyllabusHistory,
  SyllabusHistorySchema,
  SyllabusSchema,
} from '@/database/mongo-schemas';
import {
  LectureRepository,
  LessonRepository,
  SyllabusHistoryRepository,
  SyllabusRepository,
} from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LectureService } from './services/lecture.service';
import { LessonModule } from '../lesson/lesson.module';
import { ClassroomModule } from '../classroom/classroom.module';
import { SyllabusCheckUtil } from './utils/syllabus-check.util';
import { LectureController } from './controllers/lecture.controller';
import { LectureCheckUtil } from './utils/lecture-check.util';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Syllabus.name, useFactory: async () => SyllabusSchema },
      { name: Lecture.name, useFactory: async () => LectureSchema },
      {
        name: SyllabusHistory.name,
        useFactory: async () => SyllabusHistorySchema,
      },
    ]),
    forwardRef(() => LessonModule),
    forwardRef(() => ClassroomModule),
  ],
  controllers: [SyllabusController, LectureController],
  providers: [
    SyllabusService,
    LectureService,
    SyllabusRepository,
    LectureRepository,
    SyllabusHistoryRepository,
    SyllabusCheckUtil,
    LectureCheckUtil,
  ],
  exports: [SyllabusRepository, LectureRepository],
})
export class SyllabusModule {}
