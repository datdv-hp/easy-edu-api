import ConfigKey from '@/common/config/config-key';
import { HttpStatus, TokenType } from '@/common/constants';
import { Public } from '@/common/guards/authentication.guard';
import { extractToken } from '@/common/helpers/common.functions.helper';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { IUserCredential } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { UserRepository } from '@/database/repositories';
import dayjs from '@/plugins/dayjs';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { ILoginBody } from './auth.interface';
import { loginBodySchema } from './auth.validation';
import { AuthService } from './services/auth.service';
import { AuthMongoService } from './services/auth.mongo.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly service: AuthService,
    private readonly authMongoService: AuthMongoService,
    private readonly i18n: I18nService,
    private readonly jwtService: JwtService,
    private readonly userRepo: UserRepository,
  ) {}

  @Public()
  @Post('login')
  async userLogin(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(loginBodySchema))
    body: ILoginBody,
    @Res({ passthrough: true })
    response: Response,
    @Req() request: Request,
  ) {
    try {
      const auth = await this.service.authenticate(body);
      if (!auth.success) {
        return new ErrorResponse(HttpStatus.UNAUTHORIZED, auth.errorMessage);
      }
      const accessToken = this.service.generateAccessToken(auth.user);
      const hashToken = this.service.generateHashToken(auth.user._id);
      const refreshToken = this.service.generateRefreshToken(
        auth.user,
        hashToken,
      );
      await this.authMongoService.createUserToken({
        token: refreshToken.token,
        userId: auth.user._id,
        type: TokenType.REFRESH_TOKEN,
        hashToken: hashToken,
        deletedAt: dayjs().add(refreshToken.expiresIn, 'second').toDate(),
      });
      const existedTokenNumber = extractToken(request.headers.authorization);
      if (existedTokenNumber) {
        this.service.removeAccessToken(existedTokenNumber);
      }
      const aliasAccessToken = this.service.generateAliasAccessToken(
        accessToken.token,
      );
      response.cookie('refreshToken', refreshToken.token, {
        httpOnly: true,
        maxAge: +refreshToken.expiresIn * 1000,
        // sameSite: 'none',
      });

      return new SuccessResponse({
        accessToken: aliasAccessToken,
        expiresIn: accessToken.expiresIn,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Public()
  @Get('token')
  async handleRefreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const token = request.cookies?.refreshToken;
      if (!token) {
        return new ErrorResponse(
          HttpStatus.UNAUTHORIZED,
          this.i18n.t('errors.unauthorized'),
        );
      }
      const userInfo = (await this.jwtService.verify(token, {
        secret: this.configService.get(ConfigKey.JWT_REFRESH_TOKEN_SECRET_KEY),
        ignoreExpiration: false,
      })) as IUserCredential & { iat: number; exp: number };
      if (!userInfo) {
        return new ErrorResponse(
          HttpStatus.UNAUTHORIZED,
          this.i18n.t('errors.unauthorized'),
        );
      }
      const isNeedRenewRefreshToken = dayjs()
        .add(1, 'day')
        .isAfter(userInfo.exp);
      if (!isNeedRenewRefreshToken) {
        const checkUser = await this.userRepo
          .existedById(userInfo.id)
          .lean()
          .exec();
        if (!checkUser) {
          return new ErrorResponse(
            HttpStatus.UNAUTHORIZED,
            this.i18n.t('errors.unauthorized'),
          );
        }
        const accessToken = this.service.generateAccessToken(checkUser);
        const existedTokenNumber = extractToken(request.headers.authorization);
        if (existedTokenNumber) {
          this.service.removeAccessToken(existedTokenNumber);
        }
        const aliasAccessToken = this.service.generateAliasAccessToken(
          accessToken.token,
        );
        return new SuccessResponse({
          accessToken: aliasAccessToken,
          expiresIn: accessToken.expiresIn,
        });
      }

      const [checkUser, revokedUserToken] = await Promise.all([
        this.userRepo.existedById(userInfo.id).lean().exec(),
        this.authMongoService.revokeTokenByHashToken(userInfo.hashToken),
      ]);
      if (!checkUser || !revokedUserToken) {
        return new ErrorResponse(
          HttpStatus.UNAUTHORIZED,
          this.i18n.t('errors.unauthorized'),
        );
      }

      const accessToken = this.service.generateAccessToken(checkUser);
      const hashToken = this.service.generateHashToken(checkUser._id);
      const refreshToken = this.service.generateRefreshToken(
        checkUser,
        hashToken,
      );
      await this.authMongoService.createUserToken({
        token: refreshToken.token,
        userId: checkUser._id,
        type: TokenType.REFRESH_TOKEN,
        hashToken,
        deletedAt: dayjs().add(refreshToken.expiresIn, 'second').toDate(),
      });
      const existedTokenNumber = extractToken(request.headers.authorization);
      if (existedTokenNumber) {
        this.service.removeAccessToken(existedTokenNumber);
      }
      const aliasAccessToken = this.service.generateAliasAccessToken(
        accessToken.token,
      );
      response.cookie('refreshToken', refreshToken.token, {
        httpOnly: true,
        maxAge: refreshToken.expiresIn * 1000,
        // sameSite: 'none',
      });
      return new SuccessResponse({
        accessToken: aliasAccessToken,
        expiresIn: accessToken.expiresIn,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const token = request.cookies?.refreshToken;
      if (!token) {
        return new ErrorResponse(
          HttpStatus.UNAUTHORIZED,
          this.i18n.t('errors.unauthorized'),
        );
      }
      const userInfo = (await this.jwtService.verify(token, {
        secret: this.configService.get(ConfigKey.JWT_REFRESH_TOKEN_SECRET_KEY),
        ignoreExpiration: false,
      })) as IUserCredential;
      if (!userInfo) {
        return new ErrorResponse(
          HttpStatus.UNAUTHORIZED,
          this.i18n.t('errors.unauthorized'),
        );
      }
      const [checkUser, revokedUserToken] = await Promise.all([
        this.userRepo.existedById(userInfo.id),
        this.authMongoService.revokeTokenByHashToken(userInfo.hashToken),
      ]);
      if (!checkUser || !revokedUserToken) {
        return new ErrorResponse(
          HttpStatus.UNAUTHORIZED,
          this.i18n.t('errors.unauthorized'),
        );
      }
      const existedTokenNumber = extractToken(request.headers.authorization);
      if (existedTokenNumber) {
        this.service.removeAccessToken(existedTokenNumber);
      }
      response.clearCookie('refreshToken', {
        httpOnly: true,
        // sameSite: 'none',
      });
      return new SuccessResponse(true);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
