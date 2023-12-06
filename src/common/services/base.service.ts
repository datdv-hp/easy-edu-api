import { ConfigService } from '@nestjs/config';
import { Logger } from 'winston';
import { createWinstonLogger } from './winston.service';
import { I18nContext } from 'nestjs-i18n';

export class BaseService {
  protected readonly logger: Logger;
  protected get i18n() {
    return I18nContext.current();
  }
  constructor(moduleName: string, config: ConfigService) {
    this.logger = createWinstonLogger(moduleName, config);
  }
}
