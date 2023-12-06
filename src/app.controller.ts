import { Controller, Get } from '@nestjs/common';
import { Public } from './common/guards/authentication.guard';
@Public()
@Controller('/')
export class AppController {
  @Get('ping')
  pingAlive(): string {
    return 'pong';
  }
}
