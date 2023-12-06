import { MongoCollection, RoleType } from '@/common/constants';
import { BaseService } from '@/common/services/base.service';
import { DELETE_COND } from '@/database/constants';
import { Classroom, CourseDocument, Lesson } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  CourseRepository,
  LessonRepository,
  SubjectRepository,
  UserCourseRepository,
  UserRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery, Types } from 'mongoose';
import {
  IClassDropdownFilter,
  ICourseDropdownFilter,
  ISubjectDropdownFilter,
} from './dropdown.interface';
import { sto } from '@/common/helpers/common.functions.helper';

@Injectable()
export class DropdownService extends BaseService {
  constructor(
    private readonly courseRepo: CourseRepository,
    protected readonly configService: ConfigService,
    private readonly classroomRepo: ClassroomRepository,
    private readonly userCourseRepo: UserCourseRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly userRepo: UserRepository,
    private readonly subjectRepo: SubjectRepository,
  ) {
    super(DropdownService.name, configService);
  }

  async getCourseDropdown(
    param: ICourseDropdownFilter,
    userId: Types.ObjectId,
    roleType?: RoleType,
  ) {
    try {
      if (param.classRoomId) {
        const classroom = await this.classroomRepo.model
          .findById(param.classRoomId, { courseId: 1 })
          .lean()
          .exec();
        const course = await this.courseRepo.model
          .findById(classroom.courseId, { name: 1, code: 1, subjectIds: 1 })
          .lean()
          .exec();
        return [course];
      }
      let courseIds: Types.ObjectId[];
      switch (roleType) {
        case RoleType.STUDENT: {
          const userCourses = await this.userCourseRepo
            .find({ userId }, { courseId: 1 })
            .lean()
            .exec();
          courseIds = userCourses.map((item) => item.courseId);
          break;
        }
        case RoleType.TEACHER: {
          const lesson: Lesson[] = await this.lessonRepo
            .find({ teacherId: userId }, { courseId: 1 })
            .distinct('courseId')
            .lean()
            .exec();
          courseIds = lesson.map((item) => item.courseId);
          break;
        }
        default: {
        }
      }
      const filter = courseIds?.length ? { _id: { $in: courseIds } } : {};
      const options = await this.courseRepo
        .find(filter, { name: 1, code: 1, subjectIds: 1 })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return options;
    } catch (error) {
      this.logger.error('Error in getCourseDropdown service', error);
      throw error;
    }
  }

  async getUserDropdownByCourse(courseId: string) {
    try {
      const userCourses = await this.userCourseRepo
        .find({ courseId }, { userId: 1 })
        .lean()
        .exec();
      const studentIds = userCourses.map((item) => item.userId);
      const studentsOptions = await this.userRepo
        .findByIds(studentIds, { name: 1, code: 1 })
        .lean()
        .exec();
      return studentsOptions;
    } catch (error) {
      this.logger.error('Error in getUserDropdownByCourse service', error);
      throw error;
    }
  }

  async getSubjectDropdown(params: ISubjectDropdownFilter) {
    try {
      if (params.classroomId) {
        const classroom = await this.classroomRepo.model.aggregate([
          { $match: { _id: sto(params.classroomId) } },
          {
            $lookup: {
              from: MongoCollection.COURSES,
              localField: 'courseId',
              foreignField: '_id',
              as: 'course',
              pipeline: [
                { $match: DELETE_COND },
                { $project: { subjectIds: 1 } },
              ],
            },
          },
          { $unwind: '$course' },
          { $project: { course: 1 } },
        ]);
        if (!classroom?.length) return [];
        const course = classroom?.[0]?.course as CourseDocument;
        const subjects = await this.subjectRepo
          .findByIds(course.subjectIds, { name: 1, code: 1, subjectCode: 1 })
          .lean()
          .exec();
        const subjectIds = subjects.map((item) => item._id);
        const filter: FilterQuery<Lesson> = {
          $and: [{ subject: { $in: subjectIds } }],
        };
        const lessons = await this.lessonRepo.model
          .aggregate([
            { $match: filter },
            { $group: { _id: '$subjectId', count: { $sum: 1 } } },
          ])
          .exec();
        const lessonCountObj = Object.fromEntries(
          lessons.map((item) => [item._id.toString(), item.count]),
        );
        subjects.forEach((item) => {
          item['lessonCount'] = lessonCountObj[item._id.toString()] || 0;
        });
        return subjects;
      } else {
        const subjects = await this.subjectRepo
          .find({}, { name: 1, code: 1, subjectCode: 1 })
          .lean()
          .exec();
        return subjects;
      }
    } catch (error) {
      this.logger.error('Error in getSubjectDropdown service', error);
      throw error;
    }
  }

  async getClassroomDropdown(
    params: IClassDropdownFilter,
    userId: Types.ObjectId,
    roleType?: RoleType,
  ) {
    try {
      const query: FilterQuery<Classroom> = {};
      if (params.courseId) {
        query.courseId = params.courseId;
      }
      const SELECT = { name: 1, code: 1, courseId: 1 };
      switch (roleType) {
        case RoleType.STUDENT: {
          query.participantIds = userId;
          break;
        }
        case RoleType.TEACHER: {
          const lessons: Lesson[] = await this.lessonRepo
            .find({ teacherId: userId })
            .distinct('classroomId')
            .lean()
            .exec();
          const classroomIds = lessons?.map((item) => item.classroomId);
          if (!classroomIds?.length) {
            return [];
          }
          query._id = { $in: classroomIds };
          break;
        }
        default:
          break;
      }
      const options = await this.classroomRepo
        .find(query, SELECT)
        .sort({ _id: -1 })
        .lean()
        .exec();
      return options;
    } catch (error) {
      this.logger.error('Error in getClassroomDropdown service', error);
      throw error;
    }
  }

  async getStudentsByClassroomId(
    classroomId: string,
    classroomInfo: {
      participantIds: Types.ObjectId[];
      courseId: Types.ObjectId;
    },
  ) {
    try {
      const userCourses = await this.userCourseRepo
        .find(
          {
            courseId: classroomInfo.courseId,
            userId: { $in: classroomInfo.participantIds },
          },
          { userId: 1 },
        )
        .lean()
        .exec();
      const studentIds = userCourses.map((userCourse) => userCourse.userId);
      const students = await this.userRepo
        .find({ _id: { $in: studentIds } }, { code: 1, name: 1 })
        .lean()
        .exec();
      return students;
    } catch (error) {
      throw error;
    }
  }
}
