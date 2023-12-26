import { HttpStatus, UserType } from '@/common/constants';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { Public } from '@/common/guards/authentication.guard';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { IContext, IUserCredential } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { compareSync } from 'bcrypt';
import { I18n, I18nContext } from 'nestjs-i18n';
import { UserService } from '../services/user.service';
import {
  IActiveAccountFormData,
  IUpdateProfileFormData,
} from '../user.interfaces';
import { UserCheckUtils } from '../utils/user-check.utils';
import {
  activeAccountSchema,
  changePasswordBodySchema,
  updateProfileBodySchema,
  updateTemporaryPasswordBodySchema,
} from '../validators/user.validators';
import { ObjectIdSchema } from '@/common/validations';

@Controller('user')
export class UserController {
  constructor(
    private readonly service: UserService,
    private readonly checkUtils: UserCheckUtils,
  ) {}

  @Get('my-profile')
  async getProfile(@EasyContext('user') userCtx: IUserCredential) {
    try {
      const checkExistedUser = await this.checkUtils.userExistedById({
        id: userCtx.id,
      });
      if (!checkExistedUser.valid) return checkExistedUser.error;
      const user = await this.service.getMyProfile(userCtx.id);
      return new SuccessResponse(user);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Patch('my-profile')
  async updateProfile(
    @I18n() i18n: I18nContext,
    @EasyContext('user') userCtx: IUserCredential,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(updateProfileBodySchema))
    body: IUpdateProfileFormData,
  ) {
    try {
      if (body.type !== UserType.TEACHER) {
        delete body.teacherDetail;
      }
      const updatedUser = await this.service.updateProfile(userCtx.id, body);
      if (!updatedUser) {
        return new ErrorResponse(
          HttpStatus.NOT_FOUND,
          i18n.t('user.not_found'),
        );
      }
      return new SuccessResponse(updatedUser);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Patch('temporary-password')
  async updateTemporaryPassword(
    @I18n() i18n: I18nContext,
    @EasyContext('user') userCtx: IUserCredential,
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(updateTemporaryPasswordBodySchema),
    )
    body: { password: string },
  ) {
    try {
      const checkExistedUser = await this.checkUtils.userExistedById(
        { id: userCtx.id },
        { isTemporary: 1 },
      );
      if (!checkExistedUser.valid) return checkExistedUser.error;
      if (!checkExistedUser.data.isTemporary) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          i18n.t('errors.bad_request'),
          [
            {
              errorCode: HttpStatus.ITEM_INVALID,
              key: 'password',
              message: i18n.t('user.user.notTemporaryPassword'),
            },
          ],
        );
      }

      const updatedUser = await this.service.updateTemporaryPassword(
        userCtx.id,
        body.password,
      );
      if (!updatedUser) {
        return new ErrorResponse(
          HttpStatus.NOT_FOUND,
          i18n.t('user.user.notFound'),
        );
      }
      return new SuccessResponse({ success: true });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Patch('password')
  async changePassword(
    @I18n() i18n: I18nContext,
    @EasyContext('user') userCtx: IUserCredential,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(changePasswordBodySchema))
    body: { password: string; newPassword: string },
  ) {
    try {
      const checkExistedUser = await this.checkUtils.userExistedById(
        { id: userCtx.id },
        { password: 1 },
      );
      if (!checkExistedUser.valid) return checkExistedUser.error;

      const isTruePassword = compareSync(
        body.password,
        checkExistedUser.data.password,
      );
      if (!isTruePassword) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          i18n.t('user.bad_request'),
          [
            {
              errorCode: HttpStatus.ITEM_INVALID,
              key: 'password',
              message: i18n.t('user.user.wrongPassword'),
            },
          ],
        );
      }

      const updatedUser = await this.service.changePassword(
        userCtx.id,
        body.newPassword,
      );
      if (!updatedUser) {
        return new ErrorResponse(
          HttpStatus.NOT_FOUND,
          i18n.t('user.not_found'),
        );
      }
      return new SuccessResponse({ success: true });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Public()
  @Post('active-account')
  async activeAccount(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(activeAccountSchema))
    body: IActiveAccountFormData,
  ) {
    try {
      const checkActiveUser = await this.checkUtils.notActivatedUserByEmail(
        body.email,
        { email: 1, name: 1, status: 1 },
      );
      if (!checkActiveUser.valid) return checkActiveUser.error;
      const checkUserVerify = await this.checkUtils.verifyCodeExisted(
        checkActiveUser.data._id,
        body.code,
        { updatedAt: 1 },
      );
      if (!checkUserVerify.valid) return checkUserVerify.error;

      const checkNotExpiredCode = await this.checkUtils.verifyCodeNotExpired(
        checkUserVerify.data.updatedAt,
      );
      if (!checkNotExpiredCode.valid) return checkNotExpiredCode.error;

      const user = checkActiveUser.data;
      const success = await this.service.active(
        { id: user._id, email: user.email, name: user.name },
        checkUserVerify.data._id,
      );

      return new SuccessResponse({ success });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post(':id/verify-email')
  async resendEmail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkNotActiveUser = await this.checkUtils.notActivatedUserById(
        id,
        { email: 1, name: 1, status: 1 },
      );
      if (!checkNotActiveUser.valid) return checkNotActiveUser.error;
      const success = await this.service.resendVerifyEmail(
        checkNotActiveUser.data,
        context.user.id,
      );
      return new SuccessResponse({ success });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
