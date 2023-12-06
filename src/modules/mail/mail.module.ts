import ConfigKey from '@/common/config/config-key';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get(ConfigKey.MAIL_HOST),
          port: Number(config.get(ConfigKey.MAIL_PORT)),
          ignoreTLS: true,
          secure: false,
          auth: {
            user: config.get(ConfigKey.MAIL_USER),
            pass: config.get(ConfigKey.MAIL_PASSWORD),
          },
        },
        defaults: {
          from: config.get(ConfigKey.MAIL_FROM),
        },
        template: {
          dir: __dirname + '/templates',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
