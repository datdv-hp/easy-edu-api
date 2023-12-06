import JoiDate from '@joi/date';
import JoiBase from 'joi';
import { isValidObjectId } from 'mongoose';

const joiDateExtension = (joi) => {
  return {
    ...JoiDate(joi),
    prepare: (value) => {
      if (value !== null && value !== undefined && typeof value !== 'string') {
        value = value.toString();
      }
      return { value };
    },
  };
};

const joiObjectIdExtension = (_joi: typeof JoiBase) => {
  return {
    type: 'isObjectId',
    base: _joi.string(),
    validate(value, helpers) {
      if (value && !isValidObjectId(value)) {
        return { value, errors: helpers.error('any.invalid') };
      }
      return { value };
    },
  };
};

const Joi = JoiBase.extend(
  joiDateExtension,
  joiObjectIdExtension,
) as typeof JoiBase & { isObjectId: () => JoiBase.StringSchema };
export default Joi;
