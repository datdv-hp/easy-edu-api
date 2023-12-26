import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { Role } from '@/database/mongo-schemas';
import { RoleRepository, UserRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ProjectionType } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class RoleCheckUtils {
  constructor(
    private readonly repo: RoleRepository,
    private readonly i18n: I18nService,
    private readonly userRepo: UserRepository,
  ) {}

  private get model() {
    return this.repo.model;
  }

  async duplicatedName(name: string) {
    try {
      const existedRole = await this.repo
        .existedByFields({ name })
        .lean()
        .exec();
      if (existedRole) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('role.exist'),
          [
            {
              key: 'name',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate('role.exist'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      throw error;
    }
  }

  async existedById(id: string, select: ProjectionType<Role> = ['isMaster']) {
    try {
      const existedRole = await this.model.findById(id, select).lean().exec();
      if (!existedRole || existedRole.isMaster) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('role.notFound'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('role.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedRole };
    } catch (error) {
      throw error;
    }
  }

  async notUsedRole(roleId: string) {
    try {
      const existedUser = await this.userRepo
        .existedByFields({ roleId })
        .lean()
        .exec();
      if (existedUser) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('role.cannotDeleteWhenExistUserHaveThisRole'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.CONFLICT,
              message: this.i18n.translate(
                'role.cannotDeleteWhenExistUserHaveThisRole',
              ),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      throw error;
    }
  }
}
