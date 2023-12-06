import { Module } from '@nestjs/common';
import { CronJobService } from './cron-job.service';

@Module({
  imports: [],
  controllers: [],
  providers: [CronJobService],
})
export class CronJobModule {}
