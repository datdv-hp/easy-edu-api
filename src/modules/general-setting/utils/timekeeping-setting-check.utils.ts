import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { SettingType } from '@/database/constants';
import { GeneralSetting } from '@/database/mongo-schemas';
import { GeneralSettingRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery } from 'mongoose';
import { ProjectionType } from 'mongoose';

@Injectable()
export class TimekeepingSettingCheckUtils extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly generalSettingRepo: GeneralSettingRepository,
  ) {
    super(TimekeepingSettingCheckUtils.name, configService);
  }

  async timekeepingSettingExistById(
    id: string,
    select: ProjectionType<GeneralSetting> = { _id: 1 },
  ) {
    try {
      const filter: FilterQuery<GeneralSetting> = {
        _id: id,
        type: SettingType.TIMEKEEPING,
      };
      const settingExist = await this.generalSettingRepo
        .findOne(filter, select)
        .lean()
        .exec();
      if (!settingExist) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('settings.notFound'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('settings.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: settingExist };
    } catch (error) {
      this.logger.error('Error in timekeepingSettingExistById: ', error);
      throw error;
    }
  }
}
