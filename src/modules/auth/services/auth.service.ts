import ConfigKey from '@/common/config/config-key';
import { IUserCredential } from '@/common/interfaces';
import { BaseService } from '@/common/services/base.service';
import { UserRepository } from '@/database/repositories';
import dayjs from '@/plugins/dayjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcrypt';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { I18nContext } from 'nestjs-i18n';
import { AuthProvider } from '../auth.constant';
import { ILoginBody } from '../auth.interface';

@Injectable()
export class AuthService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly jwt: JwtService,
    private readonly userRepo: UserRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super(AuthService.name, configService);
  }

  // Generate ACCESS_TOKEN by default
  generateAccessToken(user: Record<string, unknown>) {
    try {
      const secret = this.configService.get(
        ConfigKey.JWT_ACCESS_TOKEN_SECRET_KEY,
      );
      const expiresIn = this.configService.get(
        ConfigKey.JWT_ACCESS_TOKEN_EXPIRES_IN,
      );
      const tokenPayload: IUserCredential = {
        id: user?._id.toString(),
        email: user?.email as string,
      };

      return {
        token: this.jwt.sign(tokenPayload, { secret, expiresIn }),
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Error in generateAccessToken service', error);
      throw error;
    }
  }

  generateRefreshToken(user: Record<string, unknown>, hashToken: string) {
    try {
      const secret = this.configService.get(
        ConfigKey.JWT_REFRESH_TOKEN_SECRET_KEY,
      );
      const expiresIn = this.configService.get(
        ConfigKey.JWT_REFRESH_TOKEN_EXPIRES_IN,
      );
      const tokenPayload: IUserCredential = {
        id: user?._id.toString(),
        email: user?.email as string,
        hashToken,
      };
      return {
        token: this.jwt.sign(tokenPayload, { secret, expiresIn }),
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Error in generateRefreshToken service', error);
      throw error;
    }
  }

  generateHashToken(userId: Types.ObjectId): string {
    return `${userId}-${dayjs().valueOf()}`;
  }

  async authenticate(params: ILoginBody) {
    switch (params.provider) {
      case AuthProvider.EMAIL:
        return await this.authenticateByPassword(params.email, params.password);
      default:
        return {
          success: false,
          errorMessage: this.i18n.t('auth.error.invalidLoginInfo', {
            lang: I18nContext.current().lang,
          }),
        };
    }
  }

  async authenticateByPassword(email: string, password: string) {
    try {
      const user = await this.userRepo.findOne({ email }).lean().exec();
      if (!user || !password || !compareSync(password, user?.password)) {
        return {
          success: false,
          errorMessage: this.i18n.t('auth.error.invalidLoginInfo', {
            lang: I18nContext.current().lang,
          }),
        };
      }
      delete user.password;
      return {
        success: true,
        user,
      };
    } catch (error) {
      this.logger.error('Error in authenticateByPassword service', error);
      return {
        success: false,
        errorMessage: this.i18n.t('auth.error.invalidLoginInfo', {
          lang: I18nContext.current().lang,
        }),
      };
    }
  }

  generateAliasAccessToken(token: string) {
    const ttl = Number(
      this.configService.get(ConfigKey.JWT_ACCESS_TOKEN_EXPIRES_IN), // seconds
    );
    const alias = randomUUID();
    this.cache.set(alias, token, ttl * 1000); // milliseconds
    return alias;
  }

  removeAccessToken(number: string) {
    this.cache.del(number);
  }
}
