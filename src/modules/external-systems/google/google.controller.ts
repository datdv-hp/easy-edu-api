import { Public } from '@/common/guards/authentication.guard';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
} from '@nestjs/common';
import { GoogleLoginLinkDto } from './google.dto';
import { IGoogleLoginBody } from './google.interfaces';
import { GoogleService } from './google.service';
import {
  GoogleLoginEmailSchema,
  GoogleLoginLinkSchema,
} from './google.validators';

@Controller('/google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Public()
  @Get('google-login-link')
  async getGoogleLoginLink(
    @Query(new JoiValidationPipe(GoogleLoginLinkSchema))
    dto: GoogleLoginLinkDto,
  ) {
    try {
      const link = this.googleService.getGoogleLink(dto);
      return new SuccessResponse({
        link,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Public()
  @Get('google-login-email')
  async getGoogleLoginEmail(
    @Query(new JoiValidationPipe(GoogleLoginEmailSchema))
    dto: IGoogleLoginBody,
  ) {
    try {
      const email = await this.googleService.getLoginEmail(dto);
      return new SuccessResponse({
        email,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
