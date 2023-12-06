import { ValidationErrorItem } from 'joi';
import { I18nService } from 'nestjs-i18n';
import { HttpStatus } from '../constants';
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ForbiddenException,
  HttpException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { uniqueId } from 'lodash';
import { Logger } from 'winston';
import { BaseExceptionFilter } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

const translateErrorValidator = async (
  errors: ValidationErrorItem[],
  i18n: I18nService,
) => {
  const errorsMessages = await Promise.all(
    errors.map(async (error) => {
      const { type, context, path } = error;
      const key = ['validation', type].join('.');
      // Translate label
      context.label = await i18n.translate(context.label);
      // Translate message
      let message = '';
      if (context.name) {
        message = await i18n.translate(context.name, { args: context });
      } else {
        message = await i18n.translate(key, { args: context });
      }
      return {
        key: path.join('.'),
        errorCode: HttpStatus.BAD_REQUEST,
        message,
      };
    }),
  );
  return errorsMessages;
};

const handleBadRequestException = async (
  exception: BadRequestException,
  i18n: I18nService,
  request: Request,
) => {
  const res = exception.getResponse() as any;
  let errors = [];
  if (Array.isArray(res.errors) && res?.errors.length > 0) {
    errors = await translateErrorValidator(res.errors, i18n);
  }
  return {
    code: HttpStatus.BAD_REQUEST,
    message: i18n.translate('errors.400', {
      lang: request?.headers['accept-language'],
    }),
    errors,
  };
};

const handleInternalErrorException = async (
  exception: InternalServerErrorException,
  request: Request,
  logger: Logger,
  i18n: I18nService,
) => {
  const logId = `${Date.now()}${uniqueId()}`;
  const message = `System error with id = ${logId}: ${exception.message}`;
  // write detail log to trace bug
  logger.error(message, {
    requestUrl: request.url,
    request: request.body,
    exception,
  });
  // return only logId
  return {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    message: i18n.translate('errors.500', {
      lang: request?.headers['accept-language'],
      args: { param: logId },
    }),
    errors: [],
  };
};

const handleForbiddenErrorException = async (
  request: Request,
  i18n: I18nService,
) => {
  // return only logId
  return {
    code: HttpStatus.FORBIDDEN,
    message: i18n.translate('errors.forbidden', {
      lang: request?.headers['accept-language'],
    }),
    errors: [],
  };
};

@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
  constructor(
    @Inject('winston') private readonly logger: Logger,
    private readonly i18n: I18nService,
    private configService: ConfigService,
  ) {
    super();
  }

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const apiResponse = exception.getResponse() as any;
    const status = exception.getStatus();
    let parsedResponse = {
      code: status,
      message: this.i18n.translate(`errors.${status}`, {
        lang: req?.headers['accept-language'],
      }),
      errors: apiResponse?.errors || [],
    };
    this.logger.error(apiResponse.message, {
      requestUrl: req.url,
      requestBody: req.body,
      exception,
    });

    if (exception instanceof BadRequestException) {
      parsedResponse = await handleBadRequestException(
        exception,
        this.i18n,
        req,
      );
    }

    if (exception instanceof InternalServerErrorException) {
      parsedResponse = await handleInternalErrorException(
        exception,
        req,
        this.logger,
        this.i18n,
      );
    }
    if (exception instanceof ForbiddenException) {
      parsedResponse = await handleForbiddenErrorException(req, this.i18n);
    }

    return res.status(status).json(parsedResponse);
  }
}
