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
import {
  ObjectIdSchema,
  ObjectIdsSchema,
  deleteManySchema,
} from '@/common/validations';
import { ClassroomRepository, LessonRepository } from '@/database/repositories';
import dayjs from '@/plugins/dayjs';
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
import {
  IClassFilter,
  IClassroomCreateFormData,
  IClassroomSyllabusQuery,
  IClassroomUpdateFormData,
} from './classroom.interfaces';
import { ClassroomService } from './classroom.service';
import {
  classFilterSchema,
  classroomCreateSchema,
  classroomSyllabusListQuerySchema,
  classroomUpdateSchema,
} from './classroom.validators';
import { ClassroomCheckUtils } from './utils/classroom-check.utils';

@Controller('classroom')
export class ClassroomController {
  constructor(
    private i18n: I18nService,
    private readonly lessonRepository: LessonRepository,
    private readonly service: ClassroomService,
    private readonly repo: ClassroomRepository,
    private readonly checkUtils: ClassroomCheckUtils,
  ) {}

  @RolesGuard(['classroom.create'])
  @Post()
  async create(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(classroomCreateSchema))
    body: IClassroomCreateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkCourse = await this.checkUtils.CourseExistById(
        body?.courseId,
        { tuition: 1 },
      );
      if (!checkCourse.valid) return checkCourse.error;

      if (body?.participantIds?.length) {
        const checkParticipants = await this.checkUtils.allExistedParticipants(
          body.participantIds,
        );
        if (!checkParticipants.valid) return checkParticipants.error;
      }

      if (body?.teachers?.length) {
        const checkTeachers = await this.checkUtils.allExistedTeachers(
          body.teachers,
        );
        if (!checkTeachers.valid) return checkTeachers.error;
      }

      if (body?.syllabusIds?.length) {
        const checkManySyllabus = await this.checkUtils.allExistedSyllabuses(
          body.syllabusIds,
        );
        if (!checkManySyllabus.valid) return checkManySyllabus.error;
      }

      const userId = sto(context.user.id);
      const newClassroom = await this.service.create(
        {
          ...body,
          createdBy: userId,
          updatedBy: userId,
        },
        { tuition: checkCourse.data.tuition },
      );

      return new SuccessResponse(newClassroom);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['classroom.view', 'classroom.viewPersonal'])
  @Get()
  async getList(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(classFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    dto: IClassFilter,
    @EasyContext() ctx: IContext,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllWithPaging(
        dto,
        ctx.roleType,
        ctx.user.id,
      );

      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Get(':id')
  async Detail(@Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string) {
    try {
      const checkClassroom = await this.checkUtils.ClassroomExistById(id, {
        courseId: 1,
        name: 1,
        syllabusIds: 1,
        teacherIds: 1,
        startDate: 1,
        endDate: 1,
        participantIds: 1,
        color: 1,
        code: 1,
        paymentStartDate: 1,
        paymentEndDate: 1,
      });
      if (!checkClassroom.valid) return checkClassroom.error;
      return new SuccessResponse(checkClassroom.data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['classroom.detailBasic'])
  @Get(':id/detail')
  async MoreDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkClassroom = await this.checkUtils.ClassroomExistById(id);
      if (!checkClassroom.valid) return checkClassroom.error;

      const classroom = await this.service.getDetailInfo(id);
      if (!classroom) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('classroom.notFound'),
          [
            {
              key: 'id',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('classroom.notFound'),
            },
          ],
        );
      }
      return new SuccessResponse(classroom);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['classroom.update'])
  @Patch(':id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(classroomUpdateSchema))
    body: IClassroomUpdateFormData,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const checkClassroom = await this.checkUtils.ClassroomExistById(id, {
        _id: 1,
        startDate: 1,
        endDate: 1,
        syllabusIds: 1,
        participantIds: 1,
        courseId: 1,
        paymentStartDate: 1,
        paymentEndDate: 1,
      });
      if (!checkClassroom.valid) return checkClassroom.error;
      const existedClassroom = checkClassroom.data;

      if (body.syllabusIds?.length) {
        const checkSyllabuses = await this.checkUtils.allExistedSyllabuses(
          body.syllabusIds,
        );
        if (!checkSyllabuses.valid) return checkSyllabuses.error;
      }

      if (body?.startDate || body?.endDate) {
        body.startDate = body.startDate ?? existedClassroom.startDate;
        body.endDate = body.endDate ?? existedClassroom.endDate;

        if (dayjs(body.startDate) > dayjs(body.endDate)) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('errors.404'),
            [
              {
                key: 'time',
                errorCode: HttpStatus.ITEM_INVALID,
                message: this.i18n.translate('classroom.inValidDate'),
              },
            ],
          );
        }
      }

      const errors = [];
      if (body?.participantIds) {
        const checkParticipants = await this.checkUtils.allExistedParticipants(
          body.participantIds,
        );
        if (!checkParticipants.valid) return checkParticipants.error;

        const participantIds = existedClassroom.participantIds;
        if (participantIds?.length) {
          const removedParticipants = participantIds?.filter(
            (item) => !body?.participantIds?.includes(item.toString()),
          );
          if (removedParticipants?.length) {
            const existedLesson = await this.lessonRepository
              .existedByFields({
                students: { $in: removedParticipants },
                classroom: id,
              })
              .lean()
              .exec();
            if (existedLesson) {
              errors.push({
                key: 'studentHasLesson',
                errorCode: HttpStatus.CONFLICT,
                message: this.i18n.t(
                  'user.student.cannotDeleteStudentHaveLesson',
                ),
              });
            }
          }
        }
      }
      if (errors.length) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('errors.400'),
          errors,
        );
      }
      const classroom = await this.service.update(
        id,
        { ...body, updatedBy: sto(userCtx.id) },
        {
          syllabusIds: existedClassroom.syllabusIds,
          participantIds: existedClassroom.participantIds,
          courseId: existedClassroom.courseId,
          paymentStartDate: existedClassroom.paymentStartDate,
          paymentEndDate: existedClassroom.paymentEndDate,
        },
      );
      return new SuccessResponse(classroom);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['classroom.delete'])
  @Delete(':id')
  async delete(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const checkClassroom = await this.checkUtils.ClassroomExistById(id);
      if (!checkClassroom.valid) return checkClassroom.error;
      const checkLessons = await this.checkUtils.notExistedLessonOfClassrooms([
        id,
      ]);
      if (!checkLessons.valid) return checkLessons.error;

      const checkNotExistPaidTuition =
        await this.checkUtils.NotExistAnyPaidTuitionByStudentIdsAndClassroomIds(
          [id],
        );
      if (!checkNotExistPaidTuition.valid)
        return checkNotExistPaidTuition.error;
      const classroom = await this.service.deleteManyIds([id], sto(userCtx.id));
      return new SuccessResponse(classroom);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['classroom.delete'])
  @Delete()
  async deleteMany(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(deleteManySchema))
    ids: string[],
    @EasyContext('user') userCtx: IUserCredential,
  ) {
    try {
      const checkClassroomsExist = await this.checkUtils.ClassroomsExistByIds(
        ids,
      );
      if (!checkClassroomsExist.valid) return checkClassroomsExist.error;
      const checkLessons = await this.checkUtils.notExistedLessonOfClassrooms(
        ids,
      );
      if (!checkLessons.valid) return checkLessons.error;

      const checkNotExistPaidTuition =
        await this.checkUtils.NotExistAnyPaidTuitionByStudentIdsAndClassroomIds(
          ids,
        );
      if (!checkNotExistPaidTuition.valid)
        return checkNotExistPaidTuition.error;

      const status = await this.service.deleteManyIds(ids, sto(userCtx.id));
      return new SuccessResponse({ success: status });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post('/check-syllabus')
  async checkSyllabusIsAssignedToClassroom(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(ObjectIdsSchema))
    syllabusIds: string[],
  ) {
    try {
      const classroomHasSyllabus = await this.repo
        .existedByFields({
          syllabusIds: { $in: syllabusIds },
        })
        .lean()
        .exec();
      return new SuccessResponse(Boolean(classroomHasSyllabus));
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['classroom.viewSyllabus'])
  @Get(':id/syllabus')
  async getSyllabusList(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) classroomId: string,
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(classroomSyllabusListQuerySchema),
      new ModifyFilterQueryPipe(),
    )
    query: IClassroomSyllabusQuery,
  ) {
    try {
      const checkClassroomExist = await this.checkUtils.ClassroomExistById(
        classroomId,
        { _id: 1, syllabusIds: 1 },
      );
      if (!checkClassroomExist.valid) return checkClassroomExist.error;

      const classroom = checkClassroomExist.data;
      const syllabusIds = classroom.syllabusIds;

      const { items, totalItems } =
        await this.service.getClassroomSyllabusListByIds(syllabusIds, query);
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['classroom.view'])
  @Get(':id/timekeeping/teacher')
  async getTeacherTimekeeping(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) classroomId: string,
  ) {
    try {
      const checkClassroomExist = await this.checkUtils.ClassroomExistById(
        classroomId,
      );
      if (!checkClassroomExist.valid) return checkClassroomExist.error;

      const data = await this.service.getTeacherTimekeeping(classroomId);
      return new SuccessResponse(data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['classroom.viewAttendance'])
  @Get(':id/timekeeping/student')
  async getStudentTimekeeping(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) classroomId: string,
  ) {
    try {
      const checkClassroomExist = await this.checkUtils.ClassroomExistById(
        classroomId,
        { participantIds: 1 },
      );
      if (!checkClassroomExist.valid) return checkClassroomExist.error;
      const data = await this.service.getStudentTimekeeping(
        classroomId,
        checkClassroomExist.data.participantIds,
      );
      return new SuccessResponse(data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
