import { pickBy } from 'lodash';

/**
 * @param obj Features object of role
 * @returns Only features that have value is true
 */
export function compactUserFeatures(obj: Record<string, any>) {
  const _obj = pickBy(obj);
  return Object.keys(_obj).reduce((result, key) => {
    const value = _obj[key];
    result[key] =
      typeof value === 'object' ? compactUserFeatures(value) : value;
    return result;
  }, {});
}
