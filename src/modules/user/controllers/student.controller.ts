import { HttpStatus } from '@/common/constants';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { sto } from '@/common/helpers/common.functions.helper';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { IContext, IUserCredential } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema, deleteManySchema } from '@/common/validations';
import {
  CourseRepository,
  LessonRepository,
  RoleRepository,
  SubjectRepository,
  UserCourseRepository,
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
import { difference, forEach, uniq } from 'lodash';
import { I18nService } from 'nestjs-i18n';
import { StudentService } from '../services/student.service';
import { UserService } from '../services/user.service';
import {
  IStudentClassroomFilter,
  IStudentCreateFormData,
  IStudentFilter,
} from '../user.interfaces';
import { UserCheckUtils } from '../utils/user-check.utils';
import {
  classroomByStudentFilterSchema,
  createStudentSchema,
  studentFilterSchema,
  updateStudentSchema,
} from '../validators/student.validators';

@Controller('student')
export class StudentController {
  constructor(
    private readonly i18n: I18nService,
    private readonly service: StudentService,
    private readonly roleRepository: RoleRepository,
    private readonly userService: UserService,
    private readonly courseRepository: CourseRepository,
    private readonly subjectRepository: SubjectRepository,
    private readonly userCourseRepository: UserCourseRepository,
    private readonly lessonRepository: LessonRepository,
    private readonly userCheckUtils: UserCheckUtils,
  ) {}

  @RolesGuard(['student.create'])
  @Post()
  async createStudent(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createStudentSchema))
    body: IStudentCreateFormData,
    @EasyContext() ctx: IContext,
  ) {
    try {
      const checkUserExisted =
        await this.userCheckUtils.userExistedByEmailOrPhone({
          email: body.email,
          phone: body.phone,
        });
      if (!checkUserExisted.valid) return checkUserExisted.error;

      const courseIds = uniq(
        body.studentDetail?.courses?.map((item) => item.courseId),
      );
      if (courseIds?.length !== body.studentDetail?.courses?.length) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('common.error.invalidInformation'),
          [
            {
              key: 'course',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.translate('common.error.invalidInformation'),
            },
          ],
        );
      }
      const coursesExist = await this.courseRepository.allExistedByIds(
        courseIds,
      );
      if (coursesExist.length !== courseIds.length) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('common.error.invalidInformation'),
          [
            {
              key: 'course',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.translate('common.error.invalidInformation'),
            },
          ],
        );
      }
      const presenterIds = uniq(
        body.studentDetail.courses
          .map((course) => course?.presenterId)
          .filter((item) => item),
      );
      if (presenterIds.length > 0) {
        const checkPresentersExist = await this.userCheckUtils.usersExistByIds(
          { ids: presenterIds },
          { _id: 1 },
          'presenterIds',
        );
        if (!checkPresentersExist.valid) return checkPresentersExist.error;
      }
      const subjectIdsSet = new Set<string>();
      body.studentDetail?.courses?.forEach((course) => {
        course.subjectIds?.forEach((subjectId) => subjectIdsSet.add(subjectId));
      });
      const subjectsExist = await this.subjectRepository
        .allExistedByIds(Array.from(subjectIdsSet))
        .lean()
        .exec();

      if (subjectsExist.length !== subjectIdsSet.size) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('common.error.invalidInformation'),
          [
            {
              key: 'subjects',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.translate('common.error.invalidInformation'),
            },
          ],
        );
      }

      // validate role
      const checkRoleExisted = await this.userCheckUtils.roleExistedById(
        body.roleId,
      );
      if (!checkRoleExisted.valid) return checkRoleExisted.error;

      const user = await this.service.createStudent(body, ctx.user.id);
      return new SuccessResponse(user);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['student.view'])
  @Get()
  async findStudentList(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(studentFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    params: IStudentFilter,
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

  @RolesGuard(['student.view'])
  @Get('/:id')
  async studentDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema))
    id: string,
  ) {
    try {
      const user = await this.service.getDetail(id);
      if (!user) {
        return new ErrorResponse(
          HttpStatus.ITEM_NOT_FOUND,
          this.i18n.t('user.student.notFound'),
          [
            {
              key: 'student',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('user.student.notFound'),
            },
          ],
        );
      }
      return new SuccessResponse(user);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['student.viewClassroomByStudent'])
  @Get('/:id/classes')
  async classesInfoByStudentId(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) studentId: string,
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(classroomByStudentFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IStudentClassroomFilter,
  ) {
    try {
      const { items, totalItems } = await this.service.findClassesByStudentId(
        studentId,
        query,
      );
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['student.update'])
  @Patch('/:id')
  async updateStudent(
    @Param('id', new JoiValidationPipe(ObjectIdSchema))
    id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(updateStudentSchema))
    body: IStudentCreateFormData,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const student = await this.service.findOneById(id);
      if (!student) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('errors.400'),
          [
            {
              key: 'student',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('user.student.notFound'),
            },
          ],
        );
      }

      if (body.email) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
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
            this.i18n.translate('errors.400'),
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

      let removeCourseIds = [];
      const updateCourseIds = [];
      const newCourseObject = {};
      // check if student has any class with remove subjectIds
      if (body?.studentDetail?.courses) {
        const currentUserCourse = await this.userCourseRepository.model
          .find({ userId: id }, { courseId: 1, subjectIds: 1 })
          .lean()
          .exec();
        const oldCourseIds = currentUserCourse.map((item) =>
          item.courseId.toString(),
        );
        const newCourseIds = body.studentDetail.courses.map(
          (item) => item.courseId,
        );

        removeCourseIds = difference(oldCourseIds, newCourseIds);

        // check if course exist lesson => can not remove course
        const existedLesson = await this.lessonRepository
          .existedByFields({ courseId: { $in: removeCourseIds }, students: id })
          .lean()
          .exec();
        if (existedLesson) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('error.400'),
            [
              {
                key: 'course',
                errorCode: HttpStatus.CONFLICT,
                message: this.i18n.translate(
                  'user.student.cannotRemoveCourseExistLesson',
                ),
              },
            ],
          );
        }

        forEach(newCourseIds, (item) => {
          if (!removeCourseIds.includes(item)) {
            updateCourseIds.push(item);
          }
        });
        const oldCourseObject = {};
        forEach(currentUserCourse, (item) => {
          const id = item.courseId.toString();
          oldCourseObject[id] = {
            subjectIds: item?.subjectIds.map((id) => id.toString()) || [],
            presenterId: item?.presenterId,
          };
        });
        forEach(body.studentDetail.courses, (item) => {
          const id = item.courseId;
          newCourseObject[id] = {
            subjectIds: item?.subjectIds || [],
            presenterId: item?.presenterId,
          };
        });
      }

      // validate role
      if (body.roleId) {
        const isExistRole = await this.roleRepository.existedById(body.roleId);
        if (!isExistRole) {
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
      const updatedUser = await this.service.updateStudent(id, {
        ...body,
        removeCourseIds,
        updateCourseData: newCourseObject,
        updatedBy: sto(userCtx.id),
      });

      return new SuccessResponse(updatedUser);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['student.delete'])
  @Delete('/:id')
  async deleteStudent(
    @Param('id', new JoiValidationPipe(ObjectIdSchema))
    id: string,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const student = await this.service.findOneById(id);
      if (!student) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('user.student.notFound'),
          [
            {
              key: 'student',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('user.student.notFound'),
            },
          ],
        );
      }
      const existedLesson = await this.lessonRepository
        .existedByFields({ students: id })
        .lean()
        .exec();

      if (existedLesson) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('user.student.cannotDeleteStudentHaveLesson'),
          [
            {
              key: 'lesson',
              errorCode: HttpStatus.CONFLICT,
              message: this.i18n.t(
                'user.student.cannotDeleteStudentHaveLesson',
              ),
            },
          ],
        );
      }
      const checkStudentHasAnyPayment =
        await this.userCheckUtils.StudentsNotExistAnyPayment([id]);
      if (!checkStudentHasAnyPayment.valid)
        return checkStudentHasAnyPayment.error;

      await this.service.deleteStudentByIds([id], userCtx.id);
      return new SuccessResponse(id);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['student.delete'])
  @Delete()
  async bulkDeleteStudent(
    @Body(new JoiValidationPipe(deleteManySchema))
    studentIds: string[],
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const studentArr = await this.service.findByIds(studentIds);
      if (studentArr?.length !== studentIds?.length) {
        const responses = [];
        studentIds.forEach((id) => {
          const student = studentArr.find((student) => student.id === id);
          if (!student) {
            responses.push({
              key: 'student',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('user.student.notFound'),
            });
            return;
          }
          responses.push({
            valid: true,
          });
        });
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('user.student.invalidStudent'),
          responses,
        );
      }

      const existedLesson = await this.lessonRepository
        .existedByFields({ studentIds: { $in: studentIds } })
        .lean()
        .exec();

      if (existedLesson) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('user.student.cannotDeleteStudentHaveLesson'),
          [
            {
              key: 'lesson',
              errorCode: HttpStatus.CONFLICT,
              message: this.i18n.t(
                'user.student.cannotDeleteStudentHaveLesson',
              ),
            },
          ],
        );
      }

      const checkStudentHasAnyPayment =
        await this.userCheckUtils.StudentsNotExistAnyPayment(studentIds);
      if (!checkStudentHasAnyPayment.valid)
        return checkStudentHasAnyPayment.error;

      await this.service.deleteStudentByIds(studentIds, userCtx.id);
      return new SuccessResponse([studentIds]);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
