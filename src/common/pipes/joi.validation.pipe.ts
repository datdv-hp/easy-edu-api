import {
  BadRequestException,
  Injectable,
  PipeTransform,
  Scope,
} from '@nestjs/common';
import {
  ArraySchema,
  ObjectSchema,
  StringSchema,
  ValidationError,
  ValidationResult,
} from 'joi';

@Injectable({ scope: Scope.REQUEST })
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema | ArraySchema | StringSchema) {}

  transform(value) {
    const { error } = this.schema.validate(value, {
      abortEarly: false,
    }) as ValidationResult;
    if (error) {
      const { details } = error as ValidationError;
      throw new BadRequestException({ errors: details });
    }
    return value;
  }
}
