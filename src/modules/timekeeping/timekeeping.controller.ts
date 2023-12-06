import { HttpStatus, RoleType } from '@/common/constants';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { IContext } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { UserRepository } from '@/database/repositories';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  IFilterListTeacher,
  IFilterListTeacherTimekeeping,
  ITimekeepingCreateFormData,
  ITimekeepingUpdateFormData,
} from './timekeeping.interface';
import { TimekeepingService } from './timekeeping.service';
import {
  TeacherListFilter,
  createTimekeepingSchema,
  createManyTimekeepingSchema,
  filterListTeacherTimekeeping,
  updateTimekeepingSchema,
} from './timekeeping.validator';
import { TimekeepingCheckUtil } from './utils/timekeeping-check.util';
import dayjs from '@/plugins/dayjs';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ObjectIdSchema } from '@/common/validations';

@Controller('timekeeping')
export class TimekeepingController {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly service: TimekeepingService,
    private readonly checkUtil: TimekeepingCheckUtil,
  ) {}

  @RolesGuard(['schedule.attendance'])
  @Patch('bulk-update')
  async timekeepingBulkUpdateSchedule(
    @I18n() i18n: I18nContext,
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(createManyTimekeepingSchema),
    )
    body: ITimekeepingCreateFormData[],
    @EasyContext() context?: IContext,
  ) {
    try {
      // Check valid user
      const userIds = body.map((item) => item.userId);
      const checkUsersExist = await this.checkUtil.UsersExistByIds(userIds);
      if (!checkUsersExist.valid) return checkUsersExist.error;

      // Check valid lesson
      const lessonIds = body.map((item) => item.lessonId);
      const checkLessonsExist = await this.checkUtil.LessonsExistByIds(
        lessonIds,
        { teacherId: 1, studentIds: 1, date: 1, startTime: 1, endTime: 1 },
      );
      if (!checkLessonsExist.valid) return checkLessonsExist.error;

      const lessons = checkLessonsExist.data;
      const studentIdsInLessonObj = Object.fromEntries(
        lessons[0].studentIds.map((id) => [id.toString(), 1]),
      );
      const isStudentInLesson = userIds.every(
        (id) => studentIdsInLessonObj[id],
      );

      if (!isStudentInLesson) {
        return new ErrorResponse(HttpStatus.BAD_REQUEST, i18n.t('errors.400'), [
          {
            key: 'userInLesson',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: i18n.translate('timekeeping.userNotInLesson'),
          },
        ]);
      }

      // check if all lessons upcoming
      let isLessonUpcoming = false;
      for (let index = 0; index < lessons.length; index++) {
        const lesson = lessons[index];
        if (
          dayjs().isBefore(
            dayjs(`${lesson.date} ${lesson.startTime}`),
            'minute',
          )
        ) {
          isLessonUpcoming = true;
          break;
        }
      }
      if (isLessonUpcoming) {
        return new ErrorResponse(HttpStatus.BAD_REQUEST, i18n.t('errors.400'), [
          {
            key: 'lessonUpcoming',
            errorCode: HttpStatus.ITEM_INVALID,
            message: i18n.translate('timekeeping.lessonUpcoming'),
          },
        ]);
      }
      // check if all lessons completed
      let isLessonCompleted = false;
      for (let index = 0; index < lessons.length; index++) {
        const lesson = lessons[index];
        if (
          dayjs().isAfter(dayjs(`${lesson.date} ${lesson.endTime}`), 'minute')
        ) {
          isLessonCompleted = true;
          break;
        }
      }

      if (isLessonCompleted) {
        return new ErrorResponse(HttpStatus.BAD_REQUEST, i18n.t('errors.400'), [
          {
            key: 'timekeepingTime',
            errorCode: HttpStatus.ITEM_INVALID,
            message: i18n.translate('timekeeping.lessonCompleted'),
          },
        ]);
      }

      const result = await this.service.updateOrCreateManyIfNotExist(
        body,
        context,
      );
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  @RolesGuard(['timekeeping.view', 'timekeeping.viewPersonal'])
  @Get('teacher')
  async findTeacher(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(TeacherListFilter),
      new ModifyFilterQueryPipe(),
    )
    query: IFilterListTeacher,
    @EasyContext() context: IContext,
  ) {
    try {
      if (context.roleType === RoleType.TEACHER) {
        query['userIds'] = [context.user.id];
      }

      const { items, totalItems } =
        await this.service.findTeacherHaveTimekeeping(query);

      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['timekeeping.update', 'schedule.updateTimeKeeping'])
  @Patch()
  async timekeepingSchedule(
    @I18n() i18n: I18nContext,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createTimekeepingSchema))
    body: ITimekeepingCreateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      // Check valid user
      const checkUserExist = await this.checkUtil.UsersExistByIds([
        body.userId,
      ]);
      if (!checkUserExist.valid) return checkUserExist.error;

      // Check valid lesson
      const checkLessonExist = await this.checkUtil.LessonsExistByIds(
        [body.lessonId],
        { teacherId: 1, studentIds: 1, date: 1, startTime: 1, endTime: 1 },
      );
      if (!checkLessonExist.valid) return checkLessonExist.error;
      const lesson = checkLessonExist.data[0];

      // check valid user in lesson
      const studentIdsInLesson = lesson.studentIds.map((id) => id.toString());
      const teacherIdInLesson = lesson.teacherId.toString();
      const isStudentInLesson = studentIdsInLesson.includes(body.userId);
      const isTeacherInLesson = body.userId === teacherIdInLesson;
      if (!isStudentInLesson && !isTeacherInLesson) {
        return new ErrorResponse(HttpStatus.BAD_REQUEST, i18n.t('errors.400'), [
          {
            key: 'userInLesson',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: i18n.translate('timekeeping.userNotInLesson'),
          },
        ]);
      }

      const isLessonUpcoming = dayjs().isBefore(
        dayjs(`${lesson.date} ${lesson.startTime}`),
        'minute',
      );
      // Can not timekeeping teacher or take attendance of students if lesson is upcoming
      if (isLessonUpcoming) {
        return new ErrorResponse(HttpStatus.BAD_REQUEST, i18n.t('errors.400'), [
          {
            key: 'lessonUpcoming',
            errorCode: HttpStatus.ITEM_INVALID,
            message: i18n.translate('timekeeping.lessonUpcoming'),
          },
        ]);
      }
      const isLessonCompleted = dayjs().isAfter(
        dayjs(`${lesson.date} ${lesson.endTime}`),
        'minute',
      );
      // Can not take attendance for student if lesson is completed
      if (isLessonCompleted && isStudentInLesson) {
        return new ErrorResponse(HttpStatus.BAD_REQUEST, i18n.t('errors.400'), [
          {
            key: 'timekeepingTime',
            errorCode: HttpStatus.ITEM_INVALID,
            message: i18n.translate('timekeeping.lessonCompleted'),
          },
        ]);
      }
      const result = await this.service.createIfNotExist(body, context);
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['timekeeping.view', 'timekeeping.viewPersonal'])
  @Get('teacher/:id')
  async findTeacherByTimekeeping(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) userId: string,
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(filterListTeacherTimekeeping),
    )
    query: IFilterListTeacherTimekeeping,
  ) {
    try {
      const data = await this.service.findTimekeepingByTeacher(userId, query);

      return new SuccessResponse(data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['timekeeping.create'])
  @Patch(':id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(updateTimekeepingSchema))
    body: ITimekeepingUpdateFormData,
  ) {
    try {
      const checkTimekeepingExist = await this.checkUtil.TimekeepingExistById(
        id,
      );
      if (!checkTimekeepingExist.valid) return checkTimekeepingExist.error;
      const result = await this.service.update(id, body);
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['timekeeping.create'])
  @Post()
  async create(
    @I18n() i18n: I18nContext,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createTimekeepingSchema))
    body: ITimekeepingCreateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const [checkExistTeacher, checkExistLesson, checkTimekeepingNotExist] =
        await Promise.all([
          this.checkUtil.UsersExistByIds([body.userId]),
          this.checkUtil.LessonsExistByIds([body.lessonId], { teacherId: 1 }),
          this.checkUtil.TimekeepingNotExistByUserIdAndLessonId({
            userId: body.userId,
            lessonId: body.lessonId,
          }),
        ]);
      if (!checkExistTeacher.valid) return checkExistTeacher.error;
      if (!checkExistLesson.valid) return checkExistLesson.error;
      if (checkExistLesson.data[0].teacherId.toString() !== body.userId) {
        return new ErrorResponse(HttpStatus.BAD_REQUEST, i18n.t('errors.400'), [
          {
            key: 'user',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: i18n.translate('timekeeping.teacherNotTeachingLesson'),
          },
        ]);
      }
      if (!checkTimekeepingNotExist.valid)
        return checkTimekeepingNotExist.error;

      const result = await this.service.create(body, context);
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
