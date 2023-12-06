import { createWinstonLogger } from '@/common/services/winston.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CronJobService {
  constructor(private readonly configService: ConfigService) {}
  private readonly logger = createWinstonLogger(
    CronJobService.name,
    this.configService,
  );
}
