import {
  HttpStatus,
  MongoCollection,
  RoleType,
  UserType,
} from '@/common/constants';
import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { sto } from '@/common/helpers/common.functions.helper';
import {
  ErrorResponse,
  SuccessResponse,
} from '@/common/helpers/response.helper';
import { IContext } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { ObjectIdSchema } from '@/common/validations';
import { DELETE_COND } from '@/database/constants';
import { Role } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  CourseRepository,
  GeneralSettingRepository,
  LectureRepository,
  RoleRepository,
  SubjectRepository,
  SyllabusRepository,
  UserCourseRepository,
  UserRepository,
} from '@/database/repositories';
import {
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Query,
} from '@nestjs/common';
import { uniq } from 'lodash';
import { FilterQuery, PipelineStage } from 'mongoose';
import { I18nService } from 'nestjs-i18n';
import { roleTypeSchema } from '../role/role.validator';
import { subjectFilterSchema } from '../subject/subject.validators';
import {
  IClassDropdownFilter,
  ICourseDropdownFilter,
  ISubjectDropdownFilter,
} from './dropdown.interface';
import { DropdownService } from './dropdown.service';
import {
  ClassDropdownFilterSchema,
  CourseDropdownSchema,
} from './dropdown.validators';
import { DropdownCheckUtils } from './utils/dropdown-check.utils';

@Controller('dropdown')
export class DropdownController {
  constructor(
    private readonly i18n: I18nService,
    private readonly courseRepo: CourseRepository,
    private readonly service: DropdownService,
    private readonly userRepo: UserRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly roleRepo: RoleRepository,
    private readonly userCourseRepo: UserCourseRepository,
    private readonly classroomRepo: ClassroomRepository,
    private readonly generalSettingRepo: GeneralSettingRepository,
    private readonly syllabusRepo: SyllabusRepository,
    private readonly checkUtils: DropdownCheckUtils,
    private readonly lectureRepo: LectureRepository,
  ) {}

  @RolesGuard([
    'course.view',
    'course.viewPersonal',
    'classroom.view',
    'classroom.viewPersonal',
    'student.create',
    'student.update',
    'classroom.update',
    'classroom.create',
    'classroom.viewPersonal',
  ])
  @Get('/course')
  async courseDropdown(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(CourseDropdownSchema),
    )
    param: ICourseDropdownFilter,
    @EasyContext() ctx: IContext,
  ) {
    try {
      const courseOptions = await this.service.getCourseDropdown(
        param,
        sto(ctx.user.id),
        ctx.roleType,
      );
      return new SuccessResponse(courseOptions);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.detailBasic'])
  @Get('subject/course/:id')
  async subjectDropdownByCourse(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkExistedCourse = await this.checkUtils.existedCourse(id, {
        subjectIds: 1,
      });
      if (!checkExistedCourse.valid) return checkExistedCourse.error;

      const subjects = await this.subjectRepo
        .findByIds(checkExistedCourse.data.subjectIds, { name: 1, code: 1 })
        .lean()
        .exec();
      return new SuccessResponse(subjects);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.detailBasic'])
  @Get('user/course/:id')
  async getUserDropdownByCourse(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkExistedCourse = await this.checkUtils.existedCourse(id);
      if (!checkExistedCourse.valid) return checkExistedCourse.error;

      const options = await this.service.getUserDropdownByCourse(id);
      return new SuccessResponse(options);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'manager.create',
    'teacher.create',
    'student.create',
    'manager.update',
    'teacher.update',
    'student.update',
  ])
  @Get('role')
  async getRoleDropdown(
    @Query(
      'type',
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(roleTypeSchema),
    )
    type: RoleType,
  ) {
    try {
      const filter: FilterQuery<Role> = {
        $and: [
          {
            $or: [
              { isMaster: { $exists: false } },
              { isMaster: false || null },
            ],
          },
        ],
      };
      if (type) {
        filter.$and.push({ type });
      }
      const roles = await this.roleRepo.find(filter, ['name']).lean().exec();
      return new SuccessResponse(roles);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Get('subject')
  async getSubjectDropdown(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(subjectFilterSchema),
    )
    query: ISubjectDropdownFilter,
    @EasyContext() context?: IContext,
  ) {
    try {
      if (context.roleType === RoleType.STUDENT) {
        const query: PipelineStage[] = [
          { $match: { userId: sto(context.user.id) } },
          {
            $lookup: {
              from: MongoCollection.SUBJECTS,
              localField: 'subjectIds',
              foreignField: '_id',
              as: 'subjects',
              pipeline: [{ $match: DELETE_COND }, { $project: { name: 1 } }],
            },
          },
        ];
        const userCourses = await this.userCourseRepo.model
          .aggregate(query)
          .exec();
        const subjects = uniq(userCourses.map((item) => item.subjects).flat());
        return new SuccessResponse(subjects);
      }
      if (query.classroomId) {
        const checkExistedClassroom = await this.checkUtils.existedClassroom(
          query.classroomId,
          { _id: 1 },
          'classroomId',
        );
        if (!checkExistedClassroom.valid) return checkExistedClassroom.error;
      }
      const data = await this.service.getSubjectDropdown(query);
      return new SuccessResponse(data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'course.create',
    'course.view',
    'course.update',
    'course.viewPersonal',
  ])
  @Get('course-form')
  async getListCourseFormDropDown() {
    try {
      const options = await this.generalSettingRepo
        .find({}, { name: '$value' })
        .lean()
        .exec();
      return new SuccessResponse(options);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'teacher.view',
    'schedule.view',
    'lesson.create',
    'schedule.createLesson',
    'lesson.update',
    'schedule.updateLesson',
  ])
  @Get('teacher')
  async getTeachers() {
    try {
      const list = await this.userRepo
        .find({ type: UserType.TEACHER }, { name: 1, code: 1 })
        .lean()
        .exec();
      return new SuccessResponse(list);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['student.view'])
  @Get('student')
  async getStudents() {
    try {
      const list = await this.userRepo
        .find({ type: UserType.STUDENT }, { name: 1, code: 1 })
        .lean()
        .exec();
      return new SuccessResponse(list);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.view', 'classroom.create', 'classroom.update'])
  @Get('syllabus')
  async getSyllabusDropdown() {
    try {
      const list = await this.syllabusRepo
        .find({}, { name: 1, code: 1 })
        .lean()
        .exec();
      return new SuccessResponse(list);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['student.view'])
  @Get('student-by-course/:courseId')
  async getStudentsByCourse(
    @Param('courseId', new JoiValidationPipe(ObjectIdSchema)) courseId: string,
  ) {
    try {
      const existedCourse = await this.courseRepo
        .existedById(courseId)
        .lean()
        .exec();
      if (!existedCourse) {
        return new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('course.notFound'),
        );
      }
      const options = await this.service.getUserDropdownByCourse(courseId);
      return new SuccessResponse(options);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'lesson.update',
    'lesson.create',
    'lesson.viewPersonal',
    'classroom.view',
    'classroom.viewPersonal',
    'schedule.view',
    'schedule.viewPersonal',
  ])
  @Get('/classroom')
  async getClassroomDropdown(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(ClassDropdownFilterSchema),
    )
    params: IClassDropdownFilter,
    @EasyContext() ctx: IContext,
  ) {
    try {
      const options = await this.service.getClassroomDropdown(
        params,
        sto(ctx.user.id),
        ctx.roleType,
      );
      return new SuccessResponse(options);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'student.view',
    'lesson.create',
    'lesson.update',
    'schedule.createLesson',
    'schedule.updateLesson',
  ])
  @Get('student-by-classroom/:classroomId')
  async getStudentsByClassroom(
    @Param('classroomId', new JoiValidationPipe(ObjectIdSchema))
    classroomId: string,
  ) {
    try {
      const checkExistedClassroom = await this.checkUtils.existedClassroom(
        classroomId,
        { participantIds: 1, courseId: 1 },
        'classroomId',
      );
      if (!checkExistedClassroom.valid) return checkExistedClassroom.error;
      const list = await this.service.getStudentsByClassroomId(classroomId, {
        participantIds: checkExistedClassroom.data.participantIds,
        courseId: checkExistedClassroom.data.courseId,
      });
      return new SuccessResponse(list);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'syllabus.view',
    'lesson.create',
    'lesson.update',
    'lesson.updateDocument',
    'schedule.createLesson',
    'schedule.updateLesson',
  ])
  @Get('syllabus-by-classroom/:classroomId')
  async getSyllabusDropdownByClassroomId(
    @Param('classroomId', new JoiValidationPipe(ObjectIdSchema))
    classroomId: string,
  ) {
    try {
      const checkExistedClassroom = await this.checkUtils.existedClassroom(
        classroomId,
        { syllabusIds: 1 },
      );
      if (!checkExistedClassroom.valid) return checkExistedClassroom.error;
      const syllabusIds = checkExistedClassroom.data.syllabusIds;
      const syllabuses = await this.syllabusRepo
        .findByIds(syllabusIds, { name: 1 })
        .lean()
        .exec();
      return new SuccessResponse(syllabuses);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard([
    'lesson.create',
    'lesson.update',
    'lesson.updateDocument',
    'schedule.createLesson',
    'schedule.updateLesson',
  ])
  @Get('lectures-by-syllabus/:syllabusId')
  async getDropdownLecturesBySyllabus(
    @Param('syllabusId', new JoiValidationPipe(ObjectIdSchema))
    syllabusId: string,
  ) {
    try {
      const checkExistedSyllabus = await this.checkUtils.existedSyllabusById(
        syllabusId,
      );
      if (!checkExistedSyllabus.valid) return checkExistedSyllabus.error;

      const result = await this.lectureRepo
        .find({ syllabusId }, { name: 1 })
        .lean()
        .exec();

      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
