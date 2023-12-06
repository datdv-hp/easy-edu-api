import { Timekeeping, TimekeepingSchema } from '@/database/mongo-schemas';
import { TimekeepingRepository } from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LessonModule } from '../lesson/lesson.module';
import { UserModule } from '../user/user.module';
import { TimekeepingController } from './timekeeping.controller';
import { TimekeepingService } from './timekeeping.service';
import { TimekeepingCheckUtil } from './utils/timekeeping-check.util';
import { ClassroomModule } from '../classroom/classroom.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Timekeeping.name, useFactory: async () => TimekeepingSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => LessonModule),
    forwardRef(() => ClassroomModule),
  ],
  controllers: [TimekeepingController],
  providers: [TimekeepingService, TimekeepingRepository, TimekeepingCheckUtil],
  exports: [TimekeepingRepository],
})
export class TimekeepingModule {}
