import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import {
  Classroom,
  ClassroomDocument,
  CourseDocument,
  Syllabus,
} from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  CourseRepository,
  SyllabusRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ProjectionType } from 'mongoose';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class DropdownCheckUtils {
  constructor(
    private readonly courseRepo: CourseRepository,
    private readonly classroomRepo: ClassroomRepository,
    private readonly syllabusRepo: SyllabusRepository,
  ) {}
  private get i18n() {
    return I18nContext.current();
  }
  async existedCourse(
    courseId: string,
    select: ProjectionType<CourseDocument> = { _id: 1 },
  ) {
    const existedCourse = await this.courseRepo
      .findById(courseId, select)
      .lean()
      .exec();
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

  async existedClassroom(
    classroomId: string,
    select: ProjectionType<Classroom> = { _id: 1 },
    errorKey = 'id',
  ) {
    const existedClassroom = await this.classroomRepo
      .findById(classroomId, select)
      .lean()
      .exec();
    if (!existedClassroom) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('classroom.notFound'),
        [
          {
            key: errorKey,
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('classroom.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedClassroom };
  }

  async existedSyllabusById(
    syllabusId: string,
    select: ProjectionType<Syllabus> = { _id: 1 },
    errorKey = 'syllabusId',
  ) {
    const exitedSyllabus = await this.syllabusRepo
      .findById(syllabusId, select)
      .lean()
      .exec();
    if (!exitedSyllabus) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: errorKey,
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('syllabus.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: exitedSyllabus };
  }
}
