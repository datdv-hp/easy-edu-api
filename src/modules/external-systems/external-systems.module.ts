import { Module } from '@nestjs/common';
import { GoogleController } from './google/google.controller';
import { GoogleService } from './google/google.service';
@Module({
  imports: [],
  controllers: [GoogleController],
  providers: [GoogleService],
  exports: [GoogleService],
})
export class ExternalSystemsModule {}
