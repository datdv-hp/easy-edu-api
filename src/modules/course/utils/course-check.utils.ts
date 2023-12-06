import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { SettingType } from '@/database/constants';
import { Course, GeneralSetting, Subject } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  CourseRepository,
  GeneralSettingRepository,
  SubjectRepository,
  UserCourseRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { difference } from 'lodash';
import { ProjectionType, Types } from 'mongoose';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class CourseCheckUtils {
  constructor(
    private readonly repo: CourseRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly userCourseRepo: UserCourseRepository,
    private readonly classroomRepo: ClassroomRepository,
    private readonly generalSettingRepo: GeneralSettingRepository,
  ) {}
  private get model() {
    return this.repo.model;
  }
  private get i18n() {
    return I18nContext.current();
  }

  async allExistedSubjects(
    subjectIds: (string | Types.ObjectId)[],
    select: ProjectionType<Subject> = ['_id'],
  ) {
    const existedSubjects = await this.subjectRepo
      .findByIds(subjectIds, select)
      .lean()
      .exec();
    const existedIds = existedSubjects.map((item) => item._id.toString());
    if (existedSubjects.length !== subjectIds.length) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: 'subjectIds',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('subject.notFound'),
            data: difference(subjectIds, existedIds),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedSubjects };
  }

  async allExistedCourseForms(
    courseFormIds: string[],
    select: ProjectionType<GeneralSetting> = { _id: 1 },
  ) {
    const existedCourseForms = await this.generalSettingRepo
      .find(
        { _id: { $in: courseFormIds }, type: SettingType.COURSE_FORM },
        select,
      )
      .lean()
      .exec();
    const existedIds = existedCourseForms.map((item) => item._id.toString());
    if (existedCourseForms.length !== courseFormIds.length) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: 'courseFormIds',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate(
              `course-form-setting.getDetail.notExist`,
            ),
            data: difference(courseFormIds, existedIds),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedCourseForms };
  }

  async allExistedByIds(
    ids: string[],
    select: ProjectionType<Course> = ['_id'],
  ) {
    const existedCourses = await this.repo
      .find({ _id: { $in: ids } }, select)
      .lean()
      .exec();
    const existedIds = existedCourses.map((item) => item._id.toString());
    if (existedCourses.length !== ids.length) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('course-form-setting.find.notFound'),
        [
          {
            key: 'courseFormIds',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('course-form-setting.find.notFound'),
            data: difference(ids, existedIds),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true };
  }

  async existedById(id: string, select: ProjectionType<Course> = ['_id']) {
    const existedCourse = await this.repo.findById(id, select).lean().exec();
    if (!existedCourse) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('course.notFound'),
        [
          {
            key: 'id',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('course.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedCourse };
  }

  async notExistedStudentInCourses(courseIds: string[]) {
    const existedStudentInCourse = await this.userCourseRepo
      .findOne({ courseId: { $in: courseIds } })
      .lean()
      .exec();
    if (existedStudentInCourse) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('course.notAllowDeleteCourse'),
        [
          {
            errorCode: HttpStatus.ITEM_ALREADY_EXIST,
            key: 'student',
            message: this.i18n.translate('course.notAllowDeleteCourse'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true };
  }

  async notExistedClassOfCourses(courseIds: string[]) {
    const existedClass = await this.classroomRepo.existedByFields({
      courseId: { $in: courseIds },
    });
    if (existedClass) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('course.notAllowDeleteByClass'),
        [
          {
            errorCode: HttpStatus.ITEM_ALREADY_EXIST,
            key: 'classroom',
            message: this.i18n.translate('course.notAllowDeleteByClass'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true };
  }
}
