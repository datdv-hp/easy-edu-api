import { Role } from '@/database/mongo-schemas/role.schema';
import { UserRepository } from '@/database/repositories';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { get } from 'lodash';
import { PERMISSIONS_KEY } from '../constants';
import { IUserCredential } from '../interfaces';
import { BaseService } from '../services/base.service';

export const RolesGuard = (permissions: string[] | string) => {
  const _permissions = Array.isArray(permissions) ? permissions : [permissions];
  return SetMetadata(PERMISSIONS_KEY, _permissions);
};

@Injectable()
export class AuthorizationGuard extends BaseService implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    protected readonly configService: ConfigService,
    private readonly userRepo: UserRepository,
  ) {
    super(AuthorizationGuard.name, configService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const user: IUserCredential = request.user;
      const permissions = this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (!permissions?.length) return true;
      if (!user?.id) return false;
      const _user = await this.userRepo
        .findById(user.id, { roleId: 1 })
        .populate('roleId')
        .lean()
        .exec();
      if (!_user) return false;
      const role = _user.roleId as unknown as Role;
      request.roleType = role.type;
      const features = JSON.parse(role?.features);
      request.permissions = features;
      const index = permissions.findIndex((permission) =>
        get(features, permission),
      );
      return index > -1;
    } catch (error) {
      this.logger.error('ERROR in AuthorizationGuard', error);
      return false;
    }
  }
}
