import { TimeKeepingType } from '@/database/constants';

export interface ITimeKeepingSettingUpdateFormData {
  day?: number;
  isEndOfMonth?: boolean;
  type?: TimeKeepingType;
}
