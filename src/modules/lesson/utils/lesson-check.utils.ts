import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import {
  Classroom,
  Lecture,
  Lesson,
  LessonAbsent,
  Subject,
  Syllabus,
  User,
} from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  LectureRepository,
  LessonAbsentRepository,
  LessonRepository,
  SubjectRepository,
  SyllabusRepository,
  UserRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { difference, forEach, intersection } from 'lodash';
import { FilterQuery, ProjectionType } from 'mongoose';
import { ILessonTime } from '../lesson.interfaces';

@Injectable()
export class LessonCheckUtils extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly syllabusRepo: SyllabusRepository,
    private readonly lectureRepo: LectureRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly userRepo: UserRepository,
    private readonly classroomRepo: ClassroomRepository,
    private readonly repo: LessonRepository,
    private readonly lessonAbsentRepo: LessonAbsentRepository,
  ) {
    super(LessonCheckUtils.name, configService);
  }

  async existedSyllabusById(
    syllabusId: string,
    select: ProjectionType<Syllabus> = { _id: 1 },
    errorKey = 'syllabusId',
  ) {
    try {
      const existedSyllabus = await this.syllabusRepo
        .findById(syllabusId, select)
        .lean()
        .exec();
      if (!existedSyllabus) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('syllabus.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedSyllabus };
    } catch (error) {
      this.logger.error('Error in existedSyllabusById', error);
      throw error;
    }
  }

  async existedSubjectById(
    subjectId: string,
    select: ProjectionType<Subject> = { _id: 1 },
    errorKey = 'syllabusId',
  ) {
    try {
      const existedSubject = await this.subjectRepo
        .findById(subjectId, select)
        .lean()
        .exec();
      if (!existedSubject) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('subject.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedSubject };
    } catch (error) {
      this.logger.error('Error in existedSubjectById', error);
      throw error;
    }
  }

  async existedClassroomById(
    classroomId: string,
    select: ProjectionType<Classroom> = { _id: 1 },
    errorKey = 'classroomId',
  ) {
    try {
      const existedClassroom = await this.classroomRepo
        .findById(classroomId, select)
        .lean()
        .exec();
      if (!existedClassroom) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('classroom.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedClassroom };
    } catch (error) {
      this.logger.error('Error in existedClassroomById', error);
      throw error;
    }
  }

  async existedUserById(
    userId: string,
    select: ProjectionType<User> = { _id: 1 },
    errorKey = 'userId',
  ) {
    try {
      const existedUser = await this.userRepo
        .findById(userId, select)
        .lean()
        .exec();
      if (!existedUser) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('user.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedUser };
    } catch (error) {
      this.logger.error('Error in existedUserById', error);
      throw error;
    }
  }

  async existedLecturesByIds(
    lectureIds: string[],
    select: ProjectionType<Lecture> = { _id: 1 },
    errorKey = 'lectureIds',
  ) {
    try {
      const existedLectures = await this.lectureRepo
        .findByIds(lectureIds, select)
        .lean()
        .exec();
      if (existedLectures.length !== lectureIds.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('lecture.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedLectures };
    } catch (error) {
      this.logger.error('Error in existedLecturesByIds', error);
      throw error;
    }
  }

  async existedStudentsByIds(
    studentIds: string[],
    select: ProjectionType<User> = { _id: 1 },
    errorKey = 'studentIds',
  ) {
    try {
      const existedStudents = await this.userRepo
        .findByIds(studentIds, select)
        .lean()
        .exec();
      if (existedStudents.length !== studentIds.length) {
        const existedStudentIds = existedStudents.map((student) =>
          student._id.toString(),
        );
        const invalidStudentIds = difference(studentIds, existedStudentIds);
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.t('lesson.invalidStudents'),
              data: invalidStudentIds,
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedStudents };
    } catch (error) {
      this.logger.error('Error in existedStudentsByIds', error);
      throw error;
    }
  }

  async checkValidNewLessons(params: {
    classroomId: string;
    teacherId: string;
    subjectId: string;
    studentIds: string[];
    times: ILessonTime[];
  }) {
    try {
      const timeQuery = [];
      forEach(params.times, (time) => {
        timeQuery.push({
          startTime: { $lte: time.endTime },
          endTime: { $gte: time.startTime },
          date: time.date,
        });
      });
      const query: FilterQuery<Lesson> = {
        $and: [
          {
            $or: [
              { classroomId: params.classroomId, subjectId: params?.subjectId },
              { teacherId: params.teacherId },
              { studentIds: { $in: params.studentIds } },
            ],
          },
          { $or: timeQuery },
        ],
      };
      const lessons = await this.repo.find(query, {
        startTime: 1,
        endTime: 1,
        date: 1,
        classroomId: 1,
        teacherId: 1,
        studentIds: 1,
        _id: 0,
      });
      const overlappedLessons = [];
      const lessonsWithTeacherInOtherLesson = [];
      const lessonsWithStudentInOtherLesson = [];
      if (lessons?.length) {
        forEach(lessons, (lesson) => {
          const existedStudentsInOtherLesson = intersection(
            JSON.parse(JSON.stringify(lesson.studentIds)),
            params.studentIds,
          );
          if (existedStudentsInOtherLesson?.length) {
            lessonsWithStudentInOtherLesson.push({
              startTime: lesson.startTime,
              endTime: lesson.endTime,
              date: lesson.date,
              studentsInLesson: existedStudentsInOtherLesson,
            });
          }
          if (
            params.classroomId === lesson.classroomId.toString() &&
            params.subjectId === lesson.subjectId?.toString()
          ) {
            overlappedLessons.push({
              startTime: lesson.startTime,
              endTime: lesson.endTime,
              date: lesson.date,
            });
          }
          if (params.teacherId === lesson.teacherId.toString()) {
            lessonsWithTeacherInOtherLesson.push({
              startTime: lesson.startTime,
              endTime: lesson.endTime,
              date: lesson.date,
            });
          }
        });
      }
      if (lessonsWithTeacherInOtherLesson.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.cannotCreateLesson'),
          [
            {
              key: 'teacher',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate('lesson.teacherBusyInThisTime'),
              data: lessonsWithTeacherInOtherLesson,
            },
          ],
        );
        return { valid: false, error };
      }

      if (lessonsWithStudentInOtherLesson.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.cannotCreateLesson'),
          [
            {
              key: 'students',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate(
                'lesson.studentExistLessonInThisTime',
              ),
              data: lessonsWithStudentInOtherLesson,
            },
          ],
        );
        return { valid: false, error };
      }

      if (overlappedLessons.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.cannotCreateLesson'),
          [
            {
              key: 'classroom',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate('lesson.existLessonInThisTime'),
              data: overlappedLessons,
            },
          ],
        );
        return { valid: false, error };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error('Error in checkValidNewLessons', error);
      throw error;
    }
  }

  async existedLessonById(
    lessonId: string,
    select: ProjectionType<Lesson> = { _id: 1 },
    errorKey = 'id',
  ) {
    try {
      const existedLesson = await this.repo
        .findById(lessonId, select)
        .lean()
        .exec();
      if (!existedLesson) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.notFound'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('lesson.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedLesson };
    } catch (error) {
      this.logger.error('Error in existedLessonById', error);
      throw error;
    }
  }

  async existedLessonsByIds(
    lessonIds: string[],
    select: ProjectionType<Lesson> = { _id: 1 },
    errorKey = 'ids',
  ) {
    try {
      const existedLessons = await this.repo
        .findByIds(lessonIds, select)
        .lean()
        .exec();
      if (existedLessons.length !== lessonIds.length) {
        const existedStudentIds = existedLessons.map((student) =>
          student._id.toString(),
        );
        const invalidLessonIds = difference(lessonIds, existedStudentIds);
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('errors.400'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('lesson.notFound'),
              data: invalidLessonIds,
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedLessons };
    } catch (error) {
      this.logger.error('Error in existedLessonsByIds', error);
      throw error;
    }
  }

  async notExistedAbsentRequest(
    params: { lessonId: string; userId: string },
    select: ProjectionType<LessonAbsent> = { _id: 1 },
    errorKey = 'requestLeave',
  ) {
    try {
      const existedAbsentRequest = await this.lessonAbsentRepo
        .findOne({ lessonId: params.lessonId, userId: params.userId }, select)
        .lean()
        .exec();
      if (existedAbsentRequest) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('lesson.absentRequest.existed'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('lesson.absentRequest.existed'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      this.logger.error('Error in notExistedAbsentRequest', error);
      throw error;
    }
  }
  async existedAbsentRequestById(
    absentRequestId: string,
    select: ProjectionType<LessonAbsent> = { _id: 1 },
    errorKey = 'id',
  ) {
    try {
      const existedAbsentRequest = await this.lessonAbsentRepo
        .findById(absentRequestId, select)
        .lean()
        .exec();
      if (!existedAbsentRequest) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('requestLeave.notFound'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('requestLeave.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedAbsentRequest };
    } catch (error) {
      this.logger.error('Error in existedAbsentRequestById', error);
      throw error;
    }
  }
}
