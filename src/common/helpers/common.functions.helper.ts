import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import dayjs from '../../plugins/dayjs';
import { DateFormat } from '../constants';
dotenv.config();

const { DEFAULT_TIMEZONE_NAME } = process.env;
export function hashPassword(password: string) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}

export function randomPassword() {
  return crypto.randomBytes(8).toString('hex');
}

export function extractToken(bearerToken = '') {
  if (/^Bearer /.test(bearerToken)) {
    return bearerToken.slice(7);
  }
  return '';
}

export function convertTimeToUTC(time: string | Date) {
  return dayjs.tz(time, 'UTC').toDate();
}

export function isEndOfDay(
  dateTime: string | Date,
  tzName = DEFAULT_TIMEZONE_NAME,
) {
  const time = dayjs
    .tz(convertTimeToUTC(dateTime), tzName)
    .format(DateFormat.HH_mm_ss_COLON);
  return /23:59:59/.test(time);
}

export function isStartOfDay(
  dateTime: string | Date,
  tzName = DEFAULT_TIMEZONE_NAME,
) {
  const time = dayjs
    .tz(convertTimeToUTC(dateTime), tzName)
    .format(DateFormat.HH_mm_ss_COLON);
  return /00:00:00/.test(time);
}

export function sto(id?: string) {
  if (!id) return undefined;
  return new Types.ObjectId(id);
}

export function stos(ids?: string[]) {
  if (!ids) return [];
  return ids.map((id) => new Types.ObjectId(id));
}

export const generateNextCode = (
  codePrefix: string,
  lastCode?: string | number,
) => {
  const prefix = `${codePrefix}${dayjs().year()}`;
  const code =
    typeof lastCode === 'number'
      ? lastCode || 0
      : Number(lastCode?.substring(prefix.length) || 0);
  return `${prefix}${(code + 1).toString().padStart(4, '0')}`;
};

export const DTOMapper = <T extends object>(object: object): T => {
  const result = {} as T;
  Object.keys(object).forEach((key) => {
    if (object.hasOwnProperty(key)) {
      result[key] = object[key];
    }
  });
  return result;
};
