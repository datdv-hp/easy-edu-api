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
import {
  LessonRepository,
  RoleRepository,
  SubjectRepository,
} from '@/database/repositories';
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
import { TeacherService } from '../services/teacher.service';
import { UserService } from '../services/user.service';
import {
  ITeacherCreateFormData,
  ITeacherFilter,
  ITeacherFilterClassroom,
  ITeacherUpdateFormData,
} from '../user.interfaces';
import { UserCheckUtils } from '../utils/user-check.utils';
import {
  classroomByTeacherFilterSchema,
  createTeacherSchema,
  teacherFilterSchema,
  updateTeacherSchema,
} from '../validators/teacher.validators';

@Controller('teacher')
export class TeacherController {
  constructor(
    private readonly i18n: I18nService,
    private readonly service: TeacherService,
    private readonly roleRepo: RoleRepository,
    private readonly userService: UserService,
    private readonly subjectRepo: SubjectRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly checkUtils: UserCheckUtils,
  ) {}

  @RolesGuard(['teacher.create'])
  @Post()
  async create(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createTeacherSchema))
    body: ITeacherCreateFormData,
  ) {
    try {
      const existedUsers = await this.userService.existedUsersByFields({
        phone: body.phone,
        email: body.email,
      });

      if (existedUsers) {
        const emailIndex = existedUsers.findIndex(
          (user) => user.email === body.email,
        );
        const phoneIndex = existedUsers.findIndex(
          (user) => user.phone === body.phone,
        );
        if (emailIndex > -1) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('common.error.emailExist'),
            [
              {
                key: 'email',
                errorCode: HttpStatus.ITEM_ALREADY_EXIST,
                message: this.i18n.translate('common.error.emailExist'),
              },
            ],
          );
        }
        if (phoneIndex > -1) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('common.error.phoneExist'),
            [
              {
                key: 'phone',
                errorCode: HttpStatus.ITEM_ALREADY_EXIST,
                message: this.i18n.translate('common.error.phoneExist'),
              },
            ],
          );
        }
      }

      if (body?.teacherDetail?.subjectIds) {
        const subjects = await this.subjectRepo.allExistedByIds(
          body.teacherDetail.subjectIds,
        );
        if (subjects.length !== body.teacherDetail.subjectIds.length) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('subject.notFound'),
            [
              {
                key: 'teacherDetail.subjectIds',
                errorCode: HttpStatus.ITEM_NOT_FOUND,
                message: this.i18n.translate('subject.notFound'),
              },
            ],
          );
        }
      }

      // validate role
      const existedRole = await this.roleRepo
        .existedById(body.roleId)
        .lean()
        .exec();
      if (!existedRole) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('common.error.roleNotFound'),
          [
            {
              key: 'role',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('common.error.roleNotFound'),
            },
          ],
        );
      }

      const user = await this.service.createTeacher(body);
      return new SuccessResponse(user);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['teacher.view'])
  @Get()
  async find(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(teacherFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    params: ITeacherFilter,
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

  @RolesGuard(['teacher.view'])
  @Get(':id')
  async detail(@Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string) {
    try {
      const user = await this.service.getDetail(id);
      if (!user) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('user.teacher.notFound'),
          [
            {
              key: 'teacher',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('user.teacher.notFound'),
            },
          ],
        );
      }
      return new SuccessResponse(user);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['teacher.update'])
  @Patch(':id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(updateTeacherSchema))
    body: ITeacherUpdateFormData,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const checkExistedUser = await this.checkUtils.userExistedById({ id });
      if (!checkExistedUser.valid) return checkExistedUser.error;

      if (body.teacherDetail.subjectIds) {
        const subjects = await this.subjectRepo.allExistedByIds(
          body.teacherDetail.subjectIds,
        );
        if (subjects.length !== body.teacherDetail.subjectIds.length) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('subject.notFound'),
            [
              {
                key: 'teacherDetail.subjectIds',
                errorCode: HttpStatus.ITEM_NOT_FOUND,
                message: this.i18n.translate('subject.notFound'),
              },
            ],
          );
        }
      }

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
        const existedUser =
          await this.userService.checkExistedUserByPhoneOrEmail({
            phone: body.phone,
          });
        if (existedUser && existedUser._id.toString() !== id) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('common.error.phoneExist'),
            [
              {
                key: 'phone',
                errorCode: HttpStatus.ITEM_ALREADY_EXIST,
                message: this.i18n.translate('common.error.phoneExist'),
              },
            ],
          );
        }
      }

      // validate role
      if (body.roleId) {
        const existedRole = await this.roleRepo
          .existedById(body.roleId)
          .lean()
          .exec();
        if (!existedRole) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('common.error.roleNotFound'),
            [
              {
                key: 'role',
                errorCode: HttpStatus.ITEM_NOT_FOUND,
                message: this.i18n.translate('common.error.roleNotFound'),
              },
            ],
          );
        }
      }

      const updatedUser = await this.service.updateTeacher(id, {
        ...body,
        updatedBy: userCtx.id,
      });

      return new SuccessResponse(updatedUser);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['teacher.delete'])
  @Delete(':id')
  async deleteTeacherById(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const checkExistedUser = await this.checkUtils.userExistedById(
        { id: id },
        { userRole: 1 },
      );
      if (!checkExistedUser.valid) return checkExistedUser.error;

      const lessons = await this.lessonRepo.model
        .exists({ teacher: id })
        .lean()
        .exec();
      if (lessons) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('user.teacher.notDeleteTeacher'),
          [
            {
              key: 'lesson',
              errorCode: HttpStatus.CONFLICT,
              message: this.i18n.translate('user.teacher.teacherHaveLesson'),
            },
          ],
        );
      }

      if (checkExistedUser.data.userRole == UserRole.MANAGER) {
        await this.service.removeManyTeacherTag([id], userCtx.id);
      } else {
        await this.service.deleteTeacherByIds([id], userCtx.id);
      }
      return new SuccessResponse(id);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['teacher.delete'])
  @Delete()
  async bulkDeleteTeacher(
    @Body(new JoiValidationPipe(deleteManySchema)) teacherIds: string[],
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const teacherArr = await this.service.findByIds(teacherIds);

      const existedLesson = await this.lessonRepo
        .existedByFields({ teacher: { $in: teacherIds } })
        .lean()
        .exec();
      if (teacherIds?.length !== teacherArr?.length || existedLesson) {
        const responses = [];
        if (existedLesson) {
          responses.push({
            key: 'lesson',
            errorCode: HttpStatus.CONFLICT,
            message: this.i18n.translate('user.teacher.teacherHaveLesson'),
          });
        }
        teacherIds.forEach((id) => {
          const teacher = teacherArr.find((teacher) => teacher.id === id);
          if (!teacher) {
            responses.push({
              key: 'teacher',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('user.teacher.notFound'),
            });
            return;
          }
          responses.push({
            valid: true,
          });
        });
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('user.teacher.notDeleteTeacher'),
          responses,
        );
      }

      const teacherRoleManagerIds = teacherArr
        .filter((teacher) => teacher.userRole === UserRole.MANAGER)
        .map((teacher) => teacher.id);
      const teacherRoleUserIds = teacherArr
        .filter((teacher) => teacher.userRole === UserRole.USER)
        .map((teacher) => teacher.id);
      await Promise.all([
        this.service.deleteTeacherByIds(teacherRoleUserIds, userCtx.id),
        this.service.removeManyTeacherTag(teacherRoleManagerIds, userCtx.id),
      ]);

      return new SuccessResponse([teacherIds]);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // this api find classes by teacherId
  // return class + course info
  @RolesGuard(['teacher.viewClassroomByTeacher'])
  @Get(':id/class')
  async getAllTeachingClasses(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) teacherId: string,
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(classroomByTeacherFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    queryParams: ITeacherFilterClassroom,
  ) {
    try {
      const checkTeacherExist = await this.checkUtils.userExistedById({
        id: teacherId,
        type: UserType.TEACHER,
      });
      if (!checkTeacherExist.valid) return checkTeacherExist.error;

      const { items, totalItems } =
        await this.service.findAllTeachingClassesByTeacherId(
          teacherId,
          queryParams,
        );

      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
