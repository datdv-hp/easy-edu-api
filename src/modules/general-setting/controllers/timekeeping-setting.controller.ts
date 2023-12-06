import { RolesGuard } from '@/common/guards/authorization.guard';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema } from '@/common/validations';
import { GeneralSettingRepository } from '@/database/repositories';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
} from '@nestjs/common';
import { ITimeKeepingSettingUpdateFormData } from '../interfaces/timekeeping-setting.interfaces';
import { TimekeepingSettingService } from '../services';
import { TimekeepingSettingCheckUtils } from '../utils';
import { UpdateTimeKeepingSettingSchema } from '../validators/timekeeping-setting.validator';

@Controller('general-setting/timekeeping')
export class TimekeepingSettingController {
  constructor(
    private readonly generalSettingRepo: GeneralSettingRepository,
    private readonly service: TimekeepingSettingService,
    private readonly generalSettingCheckUtils: TimekeepingSettingCheckUtils,
  ) {}

  @RolesGuard([
    'settingTimekeeping.view',
    'timekeeping.view',
    'timekeeping.viewPersonal',
  ])
  @Get()
  async findTimeKeepingSetting() {
    try {
      const setting = await this.service.findTimeKeepingSetting();
      return new SuccessResponse(setting);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['settingTimekeeping.update'])
  @Patch('/:id')
  async updateTimeKeepingSetting(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(UpdateTimeKeepingSettingSchema),
    )
    dto: ITimeKeepingSettingUpdateFormData,
  ) {
    try {
      const checkSettingExist =
        await this.generalSettingCheckUtils.timekeepingSettingExistById(id);
      if (!checkSettingExist.valid) return checkSettingExist.error;

      const result = await this.service.UpdateTimeKeepingSetting(id, dto);
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
