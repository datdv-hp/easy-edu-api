import { HttpStatus } from '@/common/constants';
import { Public } from '@/common/guards/authentication.guard';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema } from '@/common/validations';
import { RegistrationStatus } from '@/database/constants';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import {
  ICreateRegistrationBody,
  IRegistrationFilter,
} from './registration.interfaces';
import { RegistrationService } from './registration.service';
import {
  StatusSchema,
  createRegistrationBodySchema,
  registrationFilterSchema,
} from './registration.validators';
import { RegistrationCheckUtil } from './utils/registration-check.util';

@Controller('registration')
export class RegistrationController {
  constructor(
    private readonly service: RegistrationService,
    private readonly checkUtil: RegistrationCheckUtil,
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

  @Patch(':id')
  async switchRegistrationStatus(
    @I18n() i18n: I18nContext,
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body('status', new JoiValidationPipe(StatusSchema))
    status: RegistrationStatus,
  ) {
    try {
      const result = await this.service.switchStatus(id, status);
      if (!result) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          i18n.translate('errors.400'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: i18n.translate('registration.notFound'),
            },
          ],
        );
      }
      return new SuccessResponse({ id: result?._id, status: result?.status });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
