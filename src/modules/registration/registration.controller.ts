import { Public } from '@/common/guards/authentication.guard';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Query,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import {
  ICreateRegistrationBody,
  IRegistrationFilter,
} from './registration.interfaces';
import { RegistrationService } from './registration.service';
import {
  createRegistrationBodySchema,
  registrationFilterSchema,
} from './registration.validators';

@Controller('registration')
export class RegistrationController {
  constructor(
    private readonly i18n: I18nService,
    private readonly service: RegistrationService,
  ) {}

  @Public()
  @Post()
  async register(
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(createRegistrationBodySchema),
    )
    body: ICreateRegistrationBody,
  ) {
    try {
      const registrationInfo = await this.service.createRegistration(body);
      return new SuccessResponse(registrationInfo);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  @Get()
  async getAllRegistration(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(registrationFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IRegistrationFilter,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllWithPaging(query);
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
