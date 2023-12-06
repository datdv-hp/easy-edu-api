import { Injectable, PipeTransform } from '@nestjs/common';
import { isPlainObject, mapKeys, trim } from 'lodash';
@Injectable()
export class TrimBodyPipe implements PipeTransform {
  constructor() {
    //
  }

  trimData(body: Record<string, any>): void {
    const trimValue = (item: any) => {
      mapKeys(item, (value, key) => {
        // trim string value
        if (typeof value === 'string') {
          item[key] = trim(value);
        }
        // trim string value
        else if (Array.isArray(value)) {
          value.forEach((subValue, index) => {
            // remove string contain only space characters
            if (typeof subValue === 'string') {
              value[index] = trim(subValue);
            } else if (isPlainObject(subValue)) {
              trimValue(subValue);
            }
          });
        } else if (isPlainObject(value)) {
          trimValue(value);
        }
      });
    };

    trimValue(body);
  }

  transform(body: Record<string, any>) {
    this.trimData(body);
    return body;
  }
}
