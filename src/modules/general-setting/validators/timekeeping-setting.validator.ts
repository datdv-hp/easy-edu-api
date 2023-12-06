import { TimeKeepingType } from '@/database/constants';
import Joi from '@/plugins/joi';

const DaySchema = Joi.number().min(1).max(31).optional();
const TimeKeepingTypeSchema = Joi.string().valid(
  ...Object.values(TimeKeepingType),
);

export const UpdateTimeKeepingSettingSchema = Joi.object({
  isEndOfMonth: Joi.boolean().optional(),
  day: Joi.when('isEndOfMonth', {
    is: false,
    then: DaySchema.required(),
    otherwise: DaySchema.optional(),
  }),
  type: TimeKeepingTypeSchema.optional(),
});
