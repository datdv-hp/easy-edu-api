import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { Registration } from '@/database/mongo-schemas';
import { RegistrationRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery } from 'mongoose';

@Injectable()
export class RegistrationCheckUtil extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: RegistrationRepository,
  ) {
    super(RegistrationCheckUtil.name, configService);
  }

  async registrationExistById(
    id: string,
    select: FilterQuery<Registration> = { _id: 1 },
  ) {
    const registration = await this.repo.findById(id, select).lean().exec();
    if (!registration) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: 'id',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('registration.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: false, data: registration };
  }
}
