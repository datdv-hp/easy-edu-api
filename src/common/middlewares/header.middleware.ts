import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import {
  DEFAULT_LANGUAGE,
  TIMEZONE_HEADER,
  TIMEZONE_NAME_HEADER,
} from '../constants';
import * as dotenv from 'dotenv';
dotenv.config();

const { DEFAULT_TIMEZONE, DEFAULT_TIMEZONE_NAME } = process.env;

@Injectable()
export class HeaderMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.headers[TIMEZONE_HEADER]) {
      req.headers[TIMEZONE_HEADER] = DEFAULT_TIMEZONE;
    }
    if (!req.headers[TIMEZONE_NAME_HEADER]) {
      req.headers[TIMEZONE_NAME_HEADER] = DEFAULT_TIMEZONE_NAME;
    }
    if (!req.headers['accept-language']) {
      req.headers['accept-language'] = DEFAULT_LANGUAGE;
    }
    next();
  }
}
