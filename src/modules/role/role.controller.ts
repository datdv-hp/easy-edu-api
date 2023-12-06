import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { I18nService } from 'nestjs-i18n';
import { RoleCheckUtils } from './utils/role-check.utils';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import {
  createRoleSchema,
  roleFilterSchema,
  updateRoleSchema,
} from './role.validator';
import {
  IRoleCreateFormData,
  IRoleFilter,
  IRoleUpdateFormData,
} from './role.interface';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { IContext } from '@/common/interfaces';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { ObjectIdSchema } from '@/common/validations';
import { HttpStatus } from '@/common/constants';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { defaultKeyFeatures } from '@/database/seeds/data/roles';
import { sto } from '@/common/helpers/common.functions.helper';

@Controller('role')
export class RoleController {
  constructor(
    private readonly service: RoleService,
    private readonly checkUtils: RoleCheckUtils,
    private readonly i18n: I18nService,
  ) {}

  @RolesGuard(['role.create'])
  @Post()
  async create(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createRoleSchema))
    body: IRoleCreateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkDuplicatedName = await this.checkUtils.duplicatedName(
        body.name,
      );
      if (!checkDuplicatedName.valid) return checkDuplicatedName.error;

      const role = await this.service.create({
        ...body,
        createdBy: sto(context.user.id),
        updatedBy: sto(context.user.id),
      });

      return new SuccessResponse(role);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['role.update'])
  @Patch('/:id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(updateRoleSchema))
    body: IRoleUpdateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const existedRole = await this.checkUtils.existedById(id);
      if (!existedRole.valid) return existedRole.error;

      if (body.name) {
        const checkDuplicatedName = await this.checkUtils.duplicatedName(
          body.name,
        );
        if (!checkDuplicatedName.valid) return checkDuplicatedName.error;
      }

      const result = await this.service.update(id, {
        ...body,
        updateBy: sto(context.user.id),
      });
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['role.view'])
  @Get()
  async getList(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(roleFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    params: IRoleFilter,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllWithPaging(
        params,
      );
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['role.view'])
  @Get('/default-features')
  getDefaultFeatures() {
    try {
      return new SuccessResponse(defaultKeyFeatures);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['role.delete'])
  @Delete('/:id')
  async delete(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedRole = await this.checkUtils.existedById(id, [
        'isMaster',
        'isDefault',
      ]);
      if (!checkExistedRole.valid) return checkExistedRole.error;

      if (checkExistedRole.data.isDefault) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('role.cannotDeleteRoleDefault'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.translate('role.cannotDeleteRoleDefault'),
            },
          ],
        );
      }

      const checkExistedUserRole = await this.checkUtils.notUsedRole(id);
      if (checkExistedUserRole) return checkExistedUserRole.error;
      const success = await this.service.deleteById(id, sto(context.user.id));
      return new SuccessResponse(success);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
