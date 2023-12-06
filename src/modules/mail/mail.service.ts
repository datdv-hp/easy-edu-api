import ConfigKey from '@/common/config/config-key';
import { BaseService } from '@/common/services/base.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IHandleAbsentContext } from './mail.interfaces';

@Injectable()
export class MailService extends BaseService {
  constructor(
    private mailerService: MailerService,
    protected readonly configService: ConfigService,
  ) {
    super(MailService.name, configService);
  }

  async send<T>(params: {
    to: string;
    from?: string;
    subject: string;
    template: string;
    context: T;
  }) {
    try {
      await this.mailerService.sendMail(params);
    } catch (error) {
      this.logger.error('Error in send service', error);
      throw error;
    }
  }

  async sendVerifyEmail(params: {
    email: string;
    name: string;
    code: string;
  }): Promise<void> {
    try {
      const FRONTEND_DOMAIN = this.configService.get(ConfigKey.FRONTEND_DOMAIN);
      await this.send({
        to: params.email,
        subject: this.i18n.translate('mail.confirmationEmail.subject'),
        template: 'verify-email',
        context: {
          title: this.i18n.translate('mail.confirmationEmail.subject'),
          greeting: this.i18n.translate(
            'mail.confirmationEmail.body.greeting',
            { args: { name: params.name } },
          ),
          intro: this.i18n.translate('mail.confirmationEmail.body.intro'),
          instructions: this.i18n.translate(
            'mail.confirmationEmail.body.action.instructions',
          ),
          actionButton: this.i18n.translate(
            'mail.confirmationEmail.body.action.button',
          ),
          url: `${FRONTEND_DOMAIN}/active-account?code=${params.code}&email=${params.email}`,
          notRequest: this.i18n.translate('mail.notYouRequest'),
        },
      });
    } catch (error) {
      this.logger.error('Error in sendVerifyEmail service', error);
      throw error;
    }
  }

  async sendNotifyHandleAbsentRequest(
    to: string,
    context: IHandleAbsentContext,
  ): Promise<void> {
    try {
      await this.send({
        to,
        subject: await this.i18n.translate(
          'mail.lessonAbsentProcessed.subject',
        ),
        template: 'handle-absent',
        context: {
          title: this.i18n.translate('mail.lessonAbsentProcessed.subject'),
          approveText: this.i18n.translate(
            'mail.lessonAbsentProcessed.approve',
            { args: context },
          ),
          rejectText: this.i18n.translate('mail.lessonAbsentProcessed.reject', {
            args: context,
          }),
        },
      });
    } catch (error) {
      this.logger.error(
        'Error in sendNotifyHandleAbsentRequest service',
        error,
      );
    }
  }

  async sendActivatedEmailSuccess(
    to: string,
    context?: {
      name: string;
      email: string;
      password: string;
      loginUrl: string;
    },
  ) {
    try {
      const subject = this.i18n.t('mail.activeAccountSuccess.subject');
      return await this.send({
        to,
        subject,
        context: {
          title: this.i18n.translate('mail.activeAccountSuccess.subject'),
          greeting: this.i18n.translate(
            'mail.activeAccountSuccess.body.greeting',
            { args: { name: context.name } },
          ),
          intro: this.i18n.translate('mail.activeAccountSuccess.body.intro'),
          email: this.i18n.translate('mail.activeAccountSuccess.body.email', {
            args: { email: context.email },
          }),
          password: this.i18n.translate(
            'mail.activeAccountSuccess.body.password',
            { args: { password: context.password } },
          ),
          loginUrl: context.loginUrl,
          button: this.i18n.translate(
            'mail.activeAccountSuccess.body.action.button',
          ),
        },
        template: 'activated-email-success',
      });
    } catch (error) {
      this.logger.error('Error in sendActivatedEmailSuccess service', error);
      throw error;
    }
  }
}
