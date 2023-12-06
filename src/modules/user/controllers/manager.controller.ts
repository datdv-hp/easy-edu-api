import { HttpStatus, UserRole, UserType } from '@/common/constants';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { IUserCredential } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema, deleteManySchema } from '@/common/validations';
import { LessonRepository } from '@/database/repositories';
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
import { I18nService } from 'nestjs-i18n';
import { ManagerService } from '../services/manager.service';
import {
  IManagerCreateFormData,
  IManagerFilter,
  IManagerUpdateFormData,
} from '../user.interfaces';
import { UserCheckUtils } from '../utils/user-check.utils';
import {
  createManagerSchema,
  managerFilterSchema,
  updateManagerSchema,
} from '../validators/manager.validators';

@Controller('manager')
export class ManagerController {
  constructor(
    private readonly i18n: I18nService,
    private readonly service: ManagerService,
    private readonly lessonRepository: LessonRepository,
    private readonly userCheckUtils: UserCheckUtils,
  ) {}

  @RolesGuard(['manager.create'])
  @Post()
  async create(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createManagerSchema))
    body: IManagerCreateFormData,
  ) {
    try {
      const checkUserExisted =
        await this.userCheckUtils.userExistedByEmailOrPhone({
          email: body.email,
          phone: body.phone,
        });
      if (!checkUserExisted.valid) return checkUserExisted.error;

      const checkRoleExisted = await this.userCheckUtils.roleExistedById(
        body.roleId,
      );
      if (!checkRoleExisted.valid) return checkRoleExisted.error;

      const user = await this.service.createManager(body);
      return new SuccessResponse(user);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['manager.view'])
  @Get()
  async find(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(managerFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    params: IManagerFilter,
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
  @RolesGuard(['manager.view'])
  @Get('/:id')
  async detail(@Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string) {
    try {
      const user = await this.service.findOneById(id);
      if (!user) {
        return new ErrorResponse(
          HttpStatus.ITEM_NOT_FOUND,
          this.i18n.t('user.manager.notFound'),
          [
            {
              key: 'manager',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('user.manager.notFound'),
            },
          ],
        );
      }
      return new SuccessResponse(user);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['manager.view'])
  @Get('/:id/detail')
  async MoreDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const user = await this.service.getManagerDetail(id);
      if (!user) {
        return new ErrorResponse(
          HttpStatus.ITEM_NOT_FOUND,
          this.i18n.t('user.manager.notFound'),
          [
            {
              key: 'manager',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('user.manager.notFound'),
            },
          ],
        );
      }
      return new SuccessResponse(user);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['manager.update'])
  @Patch('/:id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(updateManagerSchema))
    body: IManagerUpdateFormData,
    @EasyContext('user') userCtx: IUserCredential,
  ) {
    try {
      const checkUserExisted = await this.userCheckUtils.userExistedById({
        id,
        userRole: UserRole.MANAGER,
      });
      if (!checkUserExisted.valid) return checkUserExisted.error;

      // TODO: check have any lesson

      // const isTeacher = user.type === UserType.TEACHER;
      // if (isTeacher && body.isTeacher === false) {
      //   const lessons = await this.lessonRepo.checkExistsByTeacherAndSubjectIds(
      //     user._id.toString(),
      //   );
      //   if (lessons) {
      //     return new ErrorResponse(
      //       HttpStatus.BAD_REQUEST,
      //       this.i18n.translate('errors.400'),
      //       [
      //         {
      //           key: 'lesson',
      //           errorCode: HttpStatus.CONFLICT,
      //           message: this.i18n.translate(
      //             'user.manager.cannotChangeIsTeacher',
      //           ),
      //         },
      //       ],
      //     );
      //   }
      // }

      if (body.email) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('common.error.cannotChangeEmail'),
          [
            {
              key: 'email',
              errorCode: HttpStatus.UNPROCESSABLE_ENTITY,
              message: this.i18n.translate('common.error.cannotChangeEmail'),
            },
          ],
        );
      }

      if (body.phone) {
        const checkUserExisted =
          await this.userCheckUtils.userExistedByEmailOrPhone({
            phone: body.phone,
            id,
          });
        if (!checkUserExisted.valid) return checkUserExisted.error;
      }

      // validate role
      if (body.roleId) {
        const checkRoleExisted = await this.userCheckUtils.roleExistedById(
          body.roleId,
        );
        if (!checkRoleExisted.valid) return checkRoleExisted.error;
      }

      const updatedUser = await this.service.updateManager(id, {
        ...body,
        updatedBy: userCtx.id,
      });

      return new SuccessResponse(updatedUser);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['manager.delete'])
  @Delete('/:id')
  async deleteManagerById(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const checkManagerExisted = await this.userCheckUtils.userExistedById(
        {
          id,
          userRole: UserRole.MANAGER,
        },
        { type: 1 },
      );
      if (!checkManagerExisted.valid) return checkManagerExisted.error;

      if (checkManagerExisted.data.type == UserType.TEACHER) {
        const existLesson = await this.lessonRepository
          .existedByFields({ teacherId: id })
          .lean()
          .exec();
        if (existLesson) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.t('user.manager.teacherHaveLesson'),
            [
              {
                errorCode: HttpStatus.CONFLICT,
                key: 'lesson',
                message: this.i18n.translate('user.manager.teacherHaveLesson'),
              },
            ],
          );
        }
      }

      await this.service.deleteManagerByIds([id], userCtx.id);
      return new SuccessResponse(id);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['manager.delete'])
  @Delete('/')
  async bulkDeleteManager(
    @Body(new JoiValidationPipe(deleteManySchema)) managerIds: string[],
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const managerArr = await this.service.findByIds(managerIds, ['_id']);

      // check delete yourself
      const userIds = managerArr.map((manager) => manager._id.toString());

      if (userIds.includes(userCtx?.id)) {
        return new ErrorResponse(
          HttpStatus.FORBIDDEN,
          this.i18n.t('common.error.forbidden'),
          [
            {
              errorCode: HttpStatus.ITEM_INVALID,
              key: 'manager',
              message: this.i18n.t('user.manager.error.cannotDeleteYourself'),
            },
          ],
        );
      }

      // check have any lesson
      const managerTypeTeacherIds = managerArr
        .filter((manager) => manager.type === UserType.TEACHER)
        .map((manager) => manager.id);
      const lesson = await this.lessonRepository
        .existedByFields({ teacherId: { $in: managerTypeTeacherIds } })
        .lean()
        .exec();

      if (managerArr?.length !== managerIds?.length || lesson) {
        const responses = [];
        managerIds.forEach((id) => {
          const manager = managerArr.find((manager) => manager.id === id);
          if (!manager) {
            responses.push({
              key: 'manager',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('user.manager.notFound'),
            });
            return;
          }
          if (lesson) {
            responses.push({
              key: 'lesson',
              errorCode: HttpStatus.CONFLICT,
              message: this.i18n.translate('user.manager.teacherIsTeaching'),
            });
            return;
          }
          responses.push({
            valid: true,
          });
        });
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('user.manager.notDeleteManager'),
          responses,
        );
      }

      await this.service.deleteManagerByIds(managerIds, userCtx.id);

      return new SuccessResponse([managerIds]);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
