import { CodePrefix } from '@/database/constants';
import dayjs from '@/plugins/dayjs';
export const generateNextLessonCode = (lastCode?: string | number) => {
  const prefix = `${CodePrefix.LESSON}${dayjs().year()}`;
  const code =
    typeof lastCode === 'number'
      ? lastCode || 0
      : Number(lastCode?.substring(prefix.length) || 0);
  return `${prefix}${(code + 1).toString().padStart(4, '0')}`;
};

export function convertTimeStringToSeconds(time: string) {
  if (!time) return 0;
  const [h, m, s = '0'] = time.split(':');
  return +h * 3600 + +m * 60 + +s;
}

export function createDateTime(date: Date | string, time = '00:00') {
  const checkInTimeSeconds = convertTimeStringToSeconds(time);
  return dayjs(date).add(checkInTimeSeconds, 's').toDate();
}

export function getMinuteDuration(firstTime: string, secondTime: string) {
  return Math.abs(
    (convertTimeStringToSeconds(secondTime) -
      convertTimeStringToSeconds(firstTime)) /
      60,
  );
}
export const generateRandomString = (length: number) => {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};
