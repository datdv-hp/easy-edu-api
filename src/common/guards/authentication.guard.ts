import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import ConfigKey from '../config/config-key';
import { IS_PUBLIC_KEY } from '../constants';
import { extractToken } from '../helpers/common.functions.helper';
import { IUserCredential } from '../interfaces';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (isPublic) {
        return true;
      }
      const request = context.switchToHttp().getRequest();
      const accessToken = extractToken(request.headers.authorization);
      if (!accessToken) {
        throw new UnauthorizedException();
      }
      const token = (await this.cache.get(accessToken)) as string;
      if (!token) {
        throw new UnauthorizedException();
      }
      const decodedUser = await this.jwtService.verify(token, {
        secret: this.configService.get(ConfigKey.JWT_ACCESS_TOKEN_SECRET_KEY),
        ignoreExpiration: false,
      });
      request.user = decodedUser as IUserCredential;
      return true;
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}
