import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { IContext, IUserCredential } from '../interfaces';
import { RoleType } from '../constants';

type contextType = 'user' | 'lang' | 'refreshToken' | 'roleType';
export const EasyContext = createParamDecorator(
  (data: contextType, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const context = {
      user: request.user as IUserCredential,
      lang: request.headers['accept-language'],
      refreshToken: request.cookies?.refreshToken as string,
      roleType: request.roleType as RoleType,
      permissions: request.permissions,
    } as IContext;
    return data ? context?.[data] : context;
  },
);
