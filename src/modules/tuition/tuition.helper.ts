import { CodePrefix } from '@/database/constants';
import dayjs from '@/plugins/dayjs';

export const generateTuitionCode = (lastCode?: string | number) => {
  const prefix = `${CodePrefix.TUITION}${dayjs().year()}`;
  const code =
    typeof lastCode === 'number'
      ? lastCode || 0
      : Number(lastCode?.substring(prefix.length) || 0);
  return `${prefix}${(code + 1).toString().padStart(4, '0')}`;
};
