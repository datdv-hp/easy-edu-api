import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule as NestWinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import ConfigKey from '../config/config-key';

export function createWinstonLogger(
  filename: string,
  configService: ConfigService,
) {
  const NODE_ENV = configService.get(ConfigKey.NODE_ENV);
  const winstonFormat =
    NODE_ENV === 'development'
      ? winston.format.combine(
          winston.format.json(),
          winston.format.prettyPrint(),
        )
      : winston.format.json();
  return winston.createLogger({
    level: configService.get(ConfigKey.LOG_LEVEL),
    format: winstonFormat,
    defaultMeta: { service: 'easy-edu-api' },
    transports: [
      new winston.transports.Console({
        level: configService.get(ConfigKey.LOG_LEVEL),
      }),
    ],
  });
}

@Module({
  imports: [
    NestWinstonModule.forRootAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return winston.createLogger({
          level: configService.get(ConfigKey.LOG_LEVEL),
          format: winston.format.json(),
          defaultMeta: { service: 'easy-edu-api' },
          transports: [
            new winston.transports.Console({
              level: configService.get(ConfigKey.LOG_LEVEL),
            }),
            // new winston.transports.DailyRotateFile({
            //   filename: `${configService.get(
            //     ConfigKey.LOG_ROOT_FOLDER,
            //   )}/easy-edu-api-%DATE%.log`,
            //   datePattern: 'YYYY-MM-DD-HH',
            //   zippedArchive: true,
            //   maxSize: '20m',
            //   maxFiles: '14d',
            // }),
          ],
        });
      },
    }),
  ],
  providers: [],
})
export class WinstonModule {}
