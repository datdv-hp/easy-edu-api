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
  SyllabusHistoryRepository,
  SyllabusRepository,
} from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassroomModule } from '../classroom/classroom.module';
import { LessonModule } from '../lesson/lesson.module';
import { LectureController } from './controllers/lecture.controller';
import { SyllabusController } from './controllers/syllabus.controller';
import { LectureService } from './services/lecture.service';
import { SyllabusService } from './services/syllabus.service';
import { LectureCheckUtil } from './utils/lecture-check.util';
import { SyllabusCheckUtil } from './utils/syllabus-check.util';

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
