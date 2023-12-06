import ConfigKey from '@/common/config/config-key';
import { DateFormat, HttpStatus, RoleType } from '@/common/constants';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { sto, stos } from '@/common/helpers/common.functions.helper';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { IContext } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema, deleteManySchema } from '@/common/validations';
import { AbsentRequestStatus } from '@/database/constants';
import { Lesson } from '@/database/mongo-schemas';
import { UserRepository } from '@/database/repositories';
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
import { ConfigService } from '@nestjs/config';
import { forEach, get, isUndefined } from 'lodash';
import { I18nService } from 'nestjs-i18n';
import {
  IGoogleLoginBody,
  IGoogleMeetingDetail,
} from '../external-systems/google/google.interfaces';
import { GoogleService } from '../external-systems/google/google.service';
import { LessonAbsentService } from './lesson-absent.service';
import { LESSON_RANDOM_STRING_LENGTH } from './lesson.constants';
import { createDateTime, generateRandomString } from './lesson.helpers';
import {
  IHandleLessonAbsentForm,
  ILessonAbsentCreateForm,
  ILessonCreateForm,
  ILessonFilter,
  ILessonScheduleQuery,
  ILessonUpdateForm,
} from './lesson.interfaces';
import { LessonService } from './lesson.service';
import {
  CreateAbsentRequestSchema,
  ProcessAbsentRequestSchema,
  ScheduleListFilterSchema,
  UpdateLessonSchema,
  createLessonSchema,
  lessonFilterSchema,
} from './lesson.validators';
import { LessonCheckUtils } from './utils/lesson-check.utils';
@Controller('lesson')
export class LessonController {
  constructor(
    private readonly i18n: I18nService,
    private readonly service: LessonService,
    private readonly configService: ConfigService,
    private readonly userRepo: UserRepository,
    private readonly checkUtils: LessonCheckUtils,
    private readonly googleService: GoogleService,
    private readonly lessonAbsentService: LessonAbsentService,
  ) {}

  @RolesGuard(['lesson.create', 'schedule.createLesson'])
  @Post()
  async createManyLesson(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createLessonSchema))
    body: ILessonCreateForm,
    @EasyContext() context?: IContext,
  ) {
    try {
      let isValidLessonTime = true;

      // validate time if time in time in the past => can not create lesson
      forEach(body.times, (time) => {
        if (dayjs(time.date + ' ' + time.startTime).isBefore(dayjs())) {
          isValidLessonTime = false;
          return;
        }
      });
      if (!isValidLessonTime) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.invalidParameter'),
          [
            {
              key: 'time',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.t('lesson.cannotCreateLessonInPast'),
            },
          ],
        );
      }

      //validate student
      let students = [];
      if (body.studentIds) {
        const checkExistedStudents = await this.checkUtils.existedStudentsByIds(
          body.studentIds,
          { email: 1 },
        );
        if (!checkExistedStudents.valid) return checkExistedStudents.error;
        students = checkExistedStudents.data;
      }

      // validate subject
      if (body?.subjectId) {
        const checkExistedSubject = await this.checkUtils.existedSubjectById(
          body?.subjectId,
        );
        if (!checkExistedSubject.valid) return checkExistedSubject.error;
      }

      //validate syllabus and lecture
      if (body?.syllabusId) {
        const checkExistedSyllabus = await this.checkUtils.existedSyllabusById(
          body?.syllabusId,
        );
        if (!checkExistedSyllabus.valid) return checkExistedSyllabus.error;
      }

      if (body.lectureIds) {
        const checkExistedLectures = await this.checkUtils.existedLecturesByIds(
          body?.lectureIds,
        );
        if (!checkExistedLectures.valid) return checkExistedLectures.error;
      }

      // Validate classroom
      const checkExistedClassroom = await this.checkUtils.existedClassroomById(
        body.classroomId,
        { courseId: 1 },
      );
      if (!checkExistedClassroom.valid) return checkExistedClassroom.error;

      const checkExistedTeacher = await this.checkUtils.existedUserById(
        body.teacherId,
        { _id: 1 },
        'teacherId',
      );
      if (!checkExistedTeacher.valid) return checkExistedTeacher.error;

      // check teacher and classroom have lesson in this time
      const checkValidNewLessons = await this.checkUtils.checkValidNewLessons({
        classroomId: body.classroomId,
        teacherId: body.teacherId,
        subjectId: body.subjectId,
        studentIds: body.studentIds,
        times: body.times,
      });
      if (!checkValidNewLessons.valid) return checkValidNewLessons.error;

      let hangoutLinkMapByRandomString = {};
      if (body.isUseGoogleMeet) {
        const loginBody: IGoogleLoginBody = {
          code: body?.googleConfig?.code,
          redirectUri: body?.googleConfig?.redirectUri,
        };
        const randomStrings = [];
        const meetingDetails: IGoogleMeetingDetail[] = body?.times?.map(
          (time) => {
            let randomString = generateRandomString(
              LESSON_RANDOM_STRING_LENGTH,
            );
            while (randomStrings?.includes(randomString)) {
              randomString = generateRandomString(LESSON_RANDOM_STRING_LENGTH);
            }
            time.randomString = randomString;
            return {
              randomString,
              summary: body.name,
              startDateTime: dayjs(
                createDateTime(time.date, time.startTime),
              ).format(DateFormat.TIMEZONE),
              endDateTime: dayjs(
                createDateTime(time.date, time.endTime),
              ).format(DateFormat.TIMEZONE),
              attendeesEmails: students?.map((student) => {
                return {
                  email: student.email,
                };
              }),
            };
          },
        );

        hangoutLinkMapByRandomString =
          await this.googleService.createGoogleSchedule(
            loginBody,
            meetingDetails,
          );
        const errors = [];
        body?.times?.forEach((time) => {
          if (!hangoutLinkMapByRandomString[time?.randomString]) {
            errors.push({
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.t(
                'lesson.create.meetUrl.googleMeet.cannotCreate.detail',
                {
                  args: {
                    date: time.date,
                    startTime: time.startTime,
                    endTime: time.endTime,
                  },
                },
              ),
            });
          }
        });

        if (errors.length) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.t('lesson.create.meetUrl.googleMeet.cannotCreate.title'),
            errors,
          );
        }
      }

      const createLessonsBody = body.times.map((data) => {
        return {
          name: body.name,
          classroomId: sto(body.classroomId),
          subjectId: sto(body?.subjectId),
          teacherId: sto(body.teacherId),
          room: body.room,
          documents: body?.documents,
          recordings: body?.recordings,
          date: data.date,
          startTime: data.startTime,
          meetUrl:
            hangoutLinkMapByRandomString[data?.randomString] || undefined,
          endTime: data.endTime,
          courseId: checkExistedClassroom.data.courseId,
          studentIds: stos(body?.studentIds),
          lectureIds: stos(body?.lectureIds),
          syllabusId: sto(body?.syllabusId),
          createdBy: sto(context.user.id),
          updatedBy: sto(context.user.id),
          isUseGoogleMeet: body.isUseGoogleMeet,
        } as Partial<Lesson>;
      });

      await this.service.createMany(createLessonsBody);
      return new SuccessResponse(body);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['lesson.view', 'lesson.viewPersonal'])
  @Get()
  async findLessonList(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(lessonFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    dto: ILessonFilter,
    @EasyContext() context?: IContext,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllAndCount(
        dto,
        context.roleType,
        context.user.id,
      );
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['schedule.view', 'schedule.viewPersonal'])
  @Get('/schedule')
  async getScheduleForManager(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(ScheduleListFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    dto: ILessonScheduleQuery,
    @EasyContext() context?: IContext,
  ) {
    try {
      const schedules = await this.service.getSchedule(dto, context);
      return new SuccessResponse(schedules);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'lesson.update',
    'schedule.updateLesson',
    'lesson.updateDocument',
  ])
  @Get(':id')
  async LessonDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const lesson = await this.service.findLessonDetail(id);
      if (!lesson) {
        return new ErrorResponse(
          HttpStatus.NOT_FOUND,
          this.i18n.t('lesson.notFound'),
        );
      }
      return new SuccessResponse(lesson);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'lesson.view',
    'lesson.viewPersonal',
    'schedule.view',
    'schedule.viewPersonal',
  ])
  @Get('detail/:id')
  async MoreLessonDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const lesson = await this.service.findLessonDetail(id);
      if (!lesson) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.notFound'),
        );
      }
      return new SuccessResponse(lesson);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'lesson.view',
    'lesson.viewPersonal',
    'schedule.view',
    'schedule.viewPersonal',
  ])
  @Get('schedule/:id')
  async LessonDetailForSchedule(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const lesson = await this.service.findLessonDetailForSchedule(id);
      if (!lesson) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.notFound'),
        );
      }
      return new SuccessResponse(lesson);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'lesson.update',
    'lesson.updateDocument',
    'schedule.updateLesson',
  ])
  @Patch(':id')
  async updateLesson(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(UpdateLessonSchema))
    body: ILessonUpdateForm,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedLesson = await this.checkUtils.existedLessonById(id);
      if (!checkExistedLesson.valid) return checkExistedLesson.error;
      const existedLesson = checkExistedLesson.data;
      const bodyKeys = Object.keys(body);

      // check update data != documents,lectures  with user have permission updateDocument but not have permission updateAll
      const onlyUpdateDocument = ['documents', 'lectureIds'];
      let isOnlyUpdateDocument = true;
      for (let index = 0; index < bodyKeys.length; index++) {
        if (!onlyUpdateDocument.includes(bodyKeys[index])) {
          isOnlyUpdateDocument = false;
          break;
        }
      }
      if (!isOnlyUpdateDocument) {
        const features = context.permissions;
        if (
          get(features, 'lesson.updateDocument') &&
          !get(features, 'lesson.update')
        ) {
          return new ErrorResponse(
            HttpStatus.FORBIDDEN,
            this.i18n.t('lesson.notHavePermission'),
            [
              {
                key: 'id',
                errorCode: HttpStatus.ITEM_INVALID,
                message: this.i18n.t('lesson.notHavePermission'),
              },
            ],
          );
        }
      }

      // check duplicate teacher or classroom have lesson in this time
      if (body.teacherId || body.date || body.startTime || body.endTime) {
        const date = body.date || existedLesson.date;
        const startTime = body.startTime || existedLesson.startTime;
        const endTime = body.endTime || existedLesson.endTime;

        const dateTime = dayjs(
          `${existedLesson.date} ${existedLesson.startTime}`,
        );
        if (
          dayjs(dateTime).diff(dayjs(), 'hours') <
          this.configService.get(ConfigKey.LIMIT_TIME_UPDATE_LESSON)
        ) {
          // check valid body
          const allows = ['documents', 'recordings'];

          let valid = true;
          for (let index = 0; index < bodyKeys.length; index++) {
            if (!allows.includes(bodyKeys[index])) {
              valid = false;
              break;
            }
          }
          if (!valid) {
            return new ErrorResponse(
              HttpStatus.BAD_REQUEST,
              this.i18n.t('lesson.cannotUpdateLessonNotFeature'),
              [
                {
                  key: 'time',
                  errorCode: HttpStatus.ITEM_INVALID,
                  message: this.i18n.t('lesson.cannotUpdateLessonNotFeature'),
                },
              ],
            );
          }
        }
        if (dayjs(`${date} ${startTime}`).isBefore(dayjs(), 'minute')) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.translate('errors.400'),
            [
              {
                key: 'updateTime',
                errorCode: HttpStatus.ITEM_INVALID,
                message: this.i18n.translate(
                  'lesson.updateLessonTakePlaceInThePast',
                ),
              },
            ],
          );
        }

        if (body.teacherId) {
          // check teacher busy in this time
          const lesson = await this.service.findAnotherLessonByField({
            teacherId: body.teacherId,
            lessonId: id,
            date: date,
            startTime: startTime,
            endTime: endTime,
          });
          if (lesson) {
            return new ErrorResponse(
              HttpStatus.BAD_REQUEST,
              this.i18n.t('lesson.teacherBusyInThisTime'),
              [
                {
                  key: 'teacher',
                  errorCode: HttpStatus.ITEM_ALREADY_EXIST,
                  message: this.i18n.translate('lesson.teacherBusyInThisTime'),
                },
              ],
            );
          }
        }

        // check have other lesson in this time
        const lessonByClassroom = await this.service.findAnotherLessonByField({
          classroomId: existedLesson.classroomId.toString(),
          lessonId: id,
          date: date,
          startTime: startTime,
          endTime: endTime,
        });
        if (lessonByClassroom) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.t('lesson.existLessonInThisTime'),
            [
              {
                key: 'classroom',
                errorCode: HttpStatus.ITEM_ALREADY_EXIST,
                message: this.i18n.translate('lesson.existLessonInThisTime'),
              },
            ],
          );
        }
      }

      if (body.lectureIds) {
        const checkExistedLectures = await this.checkUtils.existedLecturesByIds(
          body?.lectureIds,
        );
        if (!checkExistedLectures.valid) return checkExistedLectures.error;
      }

      if (body.syllabusId) {
        const checkExistedSyllabus = await this.checkUtils.existedSyllabusById(
          body?.syllabusId,
        );
        if (!checkExistedSyllabus.valid) return checkExistedSyllabus.error;
      }

      let meetUrl: string;
      if (body.isUseGoogleMeet) {
        const studentIds = body.studentIds || existedLesson.studentIds;
        const students = await this.userRepo.findByIds(studentIds);

        const date = body?.date || existedLesson?.date;
        const startTime = body?.startTime || existedLesson?.startTime;
        const endTime = body?.endTime || existedLesson?.endTime;
        const loginBody: IGoogleLoginBody = {
          code: body?.googleConfig?.code,
          redirectUri: body?.googleConfig?.redirectUri,
        };
        const randomString = generateRandomString(LESSON_RANDOM_STRING_LENGTH);
        const meetingDetail: IGoogleMeetingDetail = {
          randomString,
          summary: body.name,
          startDateTime: dayjs(createDateTime(date, startTime)).format(
            DateFormat.TIMEZONE,
          ),
          endDateTime: dayjs(createDateTime(date, endTime)).format(
            DateFormat.TIMEZONE,
          ),
          attendeesEmails: students?.map((student) => {
            return {
              email: student.email,
            };
          }),
        };
        const hangoutLinkMapByRandomString =
          await this.googleService.createGoogleSchedule(loginBody, [
            meetingDetail,
          ]);
        meetUrl = hangoutLinkMapByRandomString[randomString] || null;
        if (!meetUrl) {
          return new ErrorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.t(
              'lesson.update.meetUrl.googleMeet.cannotCreate.detail',
              {
                args: {
                  date,
                  startTime,
                  endTime,
                },
              },
            ),
          );
        }
      } else if (!isUndefined(body.isUseGoogleMeet)) {
        meetUrl = null;
      }
      const result = await this.service.update(id, {
        ...body,
        meetUrl,
        updatedBy: context.user.id,
      });
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['lesson.delete', 'schedule.delete'])
  @Delete(':id')
  async deleteLesson(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedLesson = await this.checkUtils.existedLessonById(id, {
        date: 1,
        startTime: 1,
        endTime: 1,
      });
      if (!checkExistedLesson.valid) return checkExistedLesson.error;
      const existedLesson = checkExistedLesson.data;
      const startDateTime = dayjs(
        `${existedLesson.date} ${existedLesson.startTime}`,
      );
      const endDateTime = dayjs(
        `${existedLesson.date} ${existedLesson.endTime}`,
      );

      const isUpComing = dayjs().isBefore(startDateTime);
      const isCompleted = dayjs().isAfter(endDateTime);
      const LIMIT_TIME = this.configService.get(
        ConfigKey.LIMIT_TIME_UPDATE_LESSON,
      );
      const isUpcomingInLimitTime =
        dayjs().diff(startDateTime, 'hour') + LIMIT_TIME > 0;
      const errors = [];
      if (!isUpComing && !isCompleted) {
        errors.push({
          key: 'lessonHappening',
          errorCode: HttpStatus.ITEM_INVALID,
          message: this.i18n.translate(
            'lesson.cannotDeleteLessonInTheHappening',
          ),
        });
      }
      if (isUpcomingInLimitTime) {
        errors.push({
          key: 'lessonUpcoming',
          errorCode: HttpStatus.ITEM_INVALID,
          message: this.i18n.translate(
            'lesson.cannotDeleteLessonInTheUpcoming',
          ),
        });
      }
      if (context.roleType !== RoleType.MASTER) {
        errors.push({
          key: 'lessonPast',
          errorCode: HttpStatus.ITEM_INVALID,
          message: this.i18n.translate('lesson.cannotDeleteLessonInThePast'),
        });
      }
      if (errors?.length)
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.invalidLesson'),
          errors,
        );

      await this.service.deleteManyIds([id], context.user.id);

      return new SuccessResponse(id);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['lesson.delete'])
  @Delete()
  async DeleteManyLessons(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(deleteManySchema))
    lessonIds: string[],
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedLessonsByIds =
        await this.checkUtils.existedLessonsByIds(lessonIds, {
          date: 1,
          startTime: 1,
          endTime: 1,
        });
      if (!checkExistedLessonsByIds.valid)
        return checkExistedLessonsByIds.error;
      const existedLessons = checkExistedLessonsByIds.data;
      const errors = [];
      existedLessons.some((lesson) => {
        const startDateTime = dayjs(`${lesson.date} ${lesson.startTime}`);
        const endDateTime = dayjs(`${lesson.date} ${lesson.endTime}`);

        const isUpComing = dayjs().isBefore(startDateTime);
        const isCompleted = dayjs().isAfter(endDateTime);
        const LIMIT_TIME = this.configService.get(
          ConfigKey.LIMIT_TIME_UPDATE_LESSON,
        );
        const isUpcomingInLimitTime =
          dayjs().diff(startDateTime, 'hour') + LIMIT_TIME > 0;
        if (!isUpComing && !isCompleted) {
          errors.push({
            key: 'lessonHappening',
            errorCode: HttpStatus.ITEM_INVALID,
            message: this.i18n.translate(
              'lesson.cannotDeleteLessonInTheHappening',
            ),
          });
        }
        if (isUpcomingInLimitTime) {
          errors.push({
            key: 'lessonUpcoming',
            errorCode: HttpStatus.ITEM_INVALID,
            message: this.i18n.translate(
              'lesson.cannotDeleteLessonInTheUpcoming',
            ),
          });
        }
        if (context.roleType !== RoleType.MASTER) {
          errors.push({
            key: 'lessonPast',
            errorCode: HttpStatus.ITEM_INVALID,
            message: this.i18n.translate('lesson.cannotDeleteLessonInThePast'),
          });
        }
        return errors.length > 0;
      });

      if (errors.length > 0)
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.invalidLesson'),
          errors,
        );

      await this.service.deleteManyIds(lessonIds, context.user.id);
      return new SuccessResponse(lessonIds);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['schedule.createRequestLeave'])
  @Post('/request-leave')
  async createRequestLeave(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(CreateAbsentRequestSchema))
    body: ILessonAbsentCreateForm,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedLesson = await this.checkUtils.existedLessonById(
        body.lessonId,
      );
      if (!checkExistedLesson.valid) return checkExistedLesson.error;
      const checkNotExistedAbsentRequest =
        await this.checkUtils.notExistedAbsentRequest({
          lessonId: body.lessonId,
          userId: context.user.id,
        });
      if (!checkNotExistedAbsentRequest.valid)
        return checkNotExistedAbsentRequest.error;

      const data = await this.lessonAbsentService.create(context.user.id, {
        ...body,
        createdBy: context.user.id,
        updatedBy: context.user.id,
      });
      return new SuccessResponse(data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['schedule.attendance'])
  @Patch('/request-leave/:id')
  async HandleAbsentRequest(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(ProcessAbsentRequestSchema))
    body: IHandleLessonAbsentForm,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedAbsentRequest =
        await this.checkUtils.existedAbsentRequestById(id);
      if (!checkExistedAbsentRequest.valid)
        return checkExistedAbsentRequest.error;

      if (body.status == AbsentRequestStatus.PROCESSING) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('requestLeave.processed'),
          [
            {
              key: 'status',
              errorCode: HttpStatus.ITEM_INVALID,
              message: this.i18n.translate('requestLeave.processed'),
            },
          ],
        );
      }

      const requestLeave = await this.lessonAbsentService.update(id, {
        ...body,
        updatedBy: context.user.id,
      });

      return new SuccessResponse(requestLeave);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['schedule.deleteLeaveRequest'])
  @Delete('/request-leave/:id')
  async DeleteAbsentRequest(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedAbsentRequest =
        await this.checkUtils.existedAbsentRequestById(id, { userId: 1 });
      if (!checkExistedAbsentRequest.valid)
        return checkExistedAbsentRequest.error;

      if (
        checkExistedAbsentRequest.data.userId.toString() !== context.user.id
      ) {
        return new ErrorResponse(
          HttpStatus.FORBIDDEN,
          this.i18n.t('common.error.forbidden'),
        );
      }

      const absentRequest = await this.lessonAbsentService.delete(
        id,
        context.user.id,
      );
      return new SuccessResponse(absentRequest);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
