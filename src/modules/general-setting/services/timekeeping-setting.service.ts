import { BaseService } from '@/common/services/base.service';
import { SettingType } from '@/database/constants';
import { GeneralSettingRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITimeKeepingSettingUpdateFormData } from '../interfaces/timekeeping-setting.interfaces';

@Injectable()
export class TimekeepingSettingService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: GeneralSettingRepository,
  ) {
    super(TimekeepingSettingService.name, configService);
  }

  async findTimeKeepingSetting() {
    try {
      const timekeepingSetting = await this.repo
        .findOne({ type: SettingType.TIMEKEEPING }, { value: 1 })
        .lean()
        .exec();
      return (
        timekeepingSetting && {
          ...timekeepingSetting,
          value: JSON.parse(timekeepingSetting?.value || '{}'),
        }
      );
    } catch (error) {
      throw error;
    }
  }

  async UpdateTimeKeepingSetting(
    id: string,
    dto: ITimeKeepingSettingUpdateFormData,
  ) {
    try {
      await this.repo.findByIdAndUpdate(
        id,
        { value: JSON.stringify(dto) },
        {
          new: true,
          runValidators: true,
        },
      );
      return dto;
    } catch (error) {
      throw error;
    }
  }
}
