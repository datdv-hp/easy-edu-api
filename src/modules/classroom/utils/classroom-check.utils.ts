import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { Classroom } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  CourseRepository,
  LessonRepository,
  SyllabusRepository,
  UserRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { difference } from 'lodash';
import { ProjectionType } from 'mongoose';

@Injectable()
export class ClassroomCheckUtils extends BaseService {
  constructor(
    private readonly courseRepo: CourseRepository,
    private readonly userRepo: UserRepository,
    private readonly syllabusRepo: SyllabusRepository,
    private readonly repo: ClassroomRepository,
    private readonly lessonRepo: LessonRepository,
    protected readonly configService: ConfigService,
  ) {
    super(ClassroomCheckUtils.name, configService);
  }

  async ClassroomExistById(
    id: string,
    select: ProjectionType<Classroom> = { _id: 1 },
  ) {
    try {
      const existedClassroom = await this.repo
        .findById(id, select)
        .lean()
        .exec();

      if (!existedClassroom) {
        const error = new ErrorResponse(
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
        return { valid: false, error };
      }
      return { valid: true, data: existedClassroom };
    } catch (error) {
      this.logger.error('Error in existedById service', error);
      throw error;
    }
  }

  async CourseExistById(
    id: string,
    select: ProjectionType<Classroom> = ['_id'],
  ) {
    try {
      const course = await this.courseRepo.findById(id, select).lean().exec();
      if (!course) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('course.notFound'),
          [
            {
              key: 'course',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('course.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: course };
    } catch (error) {
      this.logger.error('Error in existedCourseById service', error);
      throw error;
    }
  }

  async allExistedParticipants(participantIds: string[]) {
    try {
      const existedParticipants = await this.userRepo
        .allExistedByIds(participantIds)
        .lean()
        .exec();
      const existedIds = existedParticipants?.map((item) =>
        item._id.toString(),
      );
      if (existedParticipants?.length != participantIds?.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('user.student.notFound'),
          [
            {
              key: 'participantIds',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('user.student.notFound'),
              data: difference(participantIds, existedIds),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      this.logger.error('Error in allExistedParticipants service', error);
      throw error;
    }
  }

  async allExistedTeachers(teacherIds: string[]) {
    try {
      const existedTeachers = await this.userRepo
        .allExistedByIds(teacherIds)
        .lean()
        .exec();
      const existedIds = existedTeachers.map((item) => item._id.toString());
      if (existedTeachers.length != teacherIds.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('user.teacher.notFound'),
          [
            {
              key: 'teacherIds',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('user.teacher.notFound'),
              data: difference(teacherIds, existedIds),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedTeachers };
    } catch (error) {
      this.logger.error('Error in allExistedTeachers service', error);
      throw error;
    }
  }

  async allExistedSyllabuses(syllabusIds: string[]) {
    try {
      const existedSyllabuses = await this.syllabusRepo
        .allExistedByIds(syllabusIds)
        .lean()
        .exec();
      const existedIds = existedSyllabuses.map((item) => item._id.toString());
      if (existedSyllabuses.length !== syllabusIds.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('syllabus.notFound'),
          [
            {
              key: 'syllabusIds',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('syllabus.notFound'),
              data: difference(syllabusIds, existedIds),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedSyllabuses };
    } catch (error) {
      this.logger.error('Error in allExistedSyllabuses service', error);
      throw error;
    }
  }

  async notExistedLessonOfClassrooms(classroomIds: string[]) {
    try {
      const existedLessons = await this.lessonRepo
        .find({ classroomId: { $in: classroomIds } }, ['name'])
        .lean()
        .exec();
      if (existedLessons?.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('classroom.notAllowDeleteByLesson'),
          [
            {
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              key: 'lesson',
              message: this.i18n.translate('classroom.notAllowDeleteByLesson'),
              data: existedLessons,
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      this.logger.error('Error in notExistedLessonOfClassrooms service', error);
      throw error;
    }
  }
}
