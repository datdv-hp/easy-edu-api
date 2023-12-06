import { MongoCollection, OrderDirection, RoleType } from '@/common/constants';
import {
  generateNextCode,
  sto,
  stos,
} from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { CodePrefix, DELETE_COND, SettingType } from '@/database/constants';
import { Course, Lesson, User } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  CourseRepository,
  EvaluationCriteriaRepository,
  GeneralSettingRepository,
  LessonRepository,
  SubjectRepository,
  UserCourseRepository,
  UserRepository,
} from '@/database/repositories';
import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { differenceBy, get, uniq } from 'lodash';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import {
  ICourseCreateFormData,
  ICourseFilter,
  ICourseUpdateFormData,
} from './course.interfaces';

@Injectable()
export class CourseService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly userCourseRepo: UserCourseRepository,
    private readonly classroomRepo: ClassroomRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly userRepo: UserRepository,
    private readonly generalSettingRepo: GeneralSettingRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly repo: CourseRepository,
    private readonly evaluationCriteriaRepo: EvaluationCriteriaRepository,
  ) {
    super(CourseService.name, configService);
  }
  private get model() {
    return this.repo.model;
  }

  async create(params: ICourseCreateFormData & { createdBy: Types.ObjectId }) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const latestCourseOfYear = await this.repo.findLatestCourseOfYear();
      const maxCode = latestCourseOfYear?.code;
      const code = generateNextCode(CodePrefix.COURSE, maxCode);
      const createdCourse = await this.repo.create(
        {
          ...params,
          subjectIds: stos(params.subjectIds),
          courseFormIds: stos(params.courseFormIds),
          code,
        },
        { session },
      );
      await session.commitTransaction();
      return createdCourse;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in create service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getCourseDetail(id: string) {
    try {
      const query: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        {
          $lookup: {
            from: MongoCollection.SUBJECTS,
            localField: 'subjectIds',
            foreignField: '_id',
            as: 'subjects',
            pipeline: [
              { $match: DELETE_COND },
              { $project: { name: 1, code: 1, subjectCode: 1 } },
            ],
          },
        },
        {
          $project: {
            name: 1,
            code: 1,
            courseFormIds: 1,
            description: 1,
            times: 1,
            subjects: 1,
          },
        },
      ];
      const course = (await this.model.aggregate(query).exec())?.[0] as Course;
      if (!course) return null;

      const [classes, students, courseForms] = await Promise.all([
        this.classroomRepo.find({ courseId: id }).lean(),
        this.userCourseRepo
          .find({ courseId: id })
          .distinct('userId')
          .lean() as Promise<User[]>,
        this.generalSettingRepo
          .find(
            {
              _id: { $in: course?.courseFormIds },
              type: SettingType.COURSE_FORM,
            },
            { value: 1 },
          )
          .lean(),
      ]);

      const courseFormNames = courseForms.map((item) => item.value);
      const totalClasses = classes.length;
      const activeClasses = classes.filter((item) => {
        return (
          dayjs(item.startDate).isBefore() && dayjs(item.endDate).isAfter()
        );
      }).length;
      const endedClasses = classes.filter((item) => {
        return dayjs(item.endDate).isBefore();
      }).length;
      const onGoingClasses = classes.filter((item) => {
        return dayjs(item.startDate).isAfter();
      }).length;
      const totalStudents = uniq(students).length;

      return {
        ...course,
        totalClasses,
        onGoingClasses,
        activeClasses,
        endedClasses,
        totalStudents,
        courseFormNames,
      };
    } catch (error) {
      this.logger.error('Error in getCourseDetail service', error);
      throw error;
    }
  }

  async findAllWithPaging(
    params: ICourseFilter,
    roleType: RoleType,
    userId: Types.ObjectId,
  ) {
    try {
      const filter: FilterQuery<Course> = {
        $and: [],
      };
      if (params?.keyword) {
        filter.$and.push({
          $or: [
            { name: { $regex: `.*${params?.keyword}.*`, $options: 'i' } },
            { code: { $regex: `.*${params?.keyword}.*`, $options: 'i' } },
          ],
        });
      }
      if (params?.courseFormIds) {
        filter.$and.push({ courseFormIds: { $in: params.courseFormIds } });
      }

      if (roleType === RoleType.TEACHER) {
        const lessons: Lesson[] = await this.lessonRepo
          .find({ teacherId: userId }, ['courseId'])
          .lean()
          .distinct('courseId');
        const courseIds = lessons.map((item) => item.courseId);
        filter.$and.push({ _id: { $in: courseIds } });
      }

      if (roleType === RoleType.STUDENT) {
        const userCourses = await this.userCourseRepo
          .find({ userId }, ['courseId'])
          .lean()
          .exec();
        const courseIds = userCourses.map((item) => item.courseId);
        filter.$and.push({ _id: { $in: courseIds } });
      }
      if (!filter.$and?.length) delete filter.$and;
      const { orderBy, skip, limit } = params;
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const query: PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.GENERAL_SETTINGS,
            localField: 'courseFormIds',
            foreignField: '_id',
            as: 'courseForms',
            pipeline: [
              { $match: DELETE_COND },
              { $project: { name: '$value' } },
            ],
          },
        },
        {
          $project: {
            courseForms: 1,
            name: 1,
            code: 1,
            description: 1,
            times: 1,
            createdAt: 1,
          },
        },
        {
          $facet: {
            data: [
              { $sort: { [orderBy]: orderDirection } },
              { $skip: skip },
              { $limit: limit },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ];
      const data = await this.model.aggregate(query).exec();
      const items = get(data, '[0].data', []);
      const totalItems = get(data, '0.total.0.count', 0);
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging service', error);
      throw error;
    }
  }

  async update(
    id: string,
    params: ICourseUpdateFormData & { updatedBy: Types.ObjectId },
    subjectIds: Types.ObjectId[],
  ): Promise<Course> {
    const session = await this.model.startSession();
    try {
      session.startTransaction();

      if (params?.subjectIds) {
        const removeSubjectIds = differenceBy(
          subjectIds,
          stos(params.subjectIds),
        );
        await this.lessonRepo.model
          .updateMany(
            { courseId: id, subjectId: { $in: removeSubjectIds } },
            { $set: { subjectId: null } },
            { session },
          )
          .exec();
      }

      const result = await this.model
        .findByIdAndUpdate(id, params, {
          new: true,
          runValidators: true,
          lean: true,
          session,
        })
        .exec();
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteById(id: string, deletedBy: Types.ObjectId) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      await this.model.deleteById(id, deletedBy).session(session).lean().exec();
      // TODO: delete evaluation criteria setting details
      // await this.evaluationCriteriaRepository.deleteEvaluationCriteriaSettingDetailsByCourseIds(
      //   [id],
      //   deletedBy,
      //   session,
      // );
      await session.commitTransaction();
      return true;
    } catch (error) {
      this.logger.error('Error in deleteById: ', error);
      await session.abortTransaction();
      return false;
    } finally {
      await session.endSession();
    }
  }

  async deleteManyByIds(ids: string[], deletedBy: Types.ObjectId) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();

      await this.model
        .delete({ _id: { $in: ids } }, deletedBy)
        .session(session)
        .lean()
        .exec();
      // TODO: delete evaluation criteria setting details
      // await this.evaluationCriteriaSettingService.deleteEvaluationCriteriaSettingDetailsByCourseIds(
      //   ids,
      //   deletedBy,
      //   session,
      // );

      await session.commitTransaction();
    } catch (error) {
      this.logger.error('Error in deleteManyCourseByIds: ', error);
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  }

  async findTeacherByCourseId(courseId: string) {
    try {
      const lessons: Lesson[] = await this.lessonRepo
        .find({ courseId }, { teacherId: 1 })
        .lean()
        .exec();
      const teacherIds = uniq(lessons.map((item) => item.teacherId.toString()));
      const teachers = await this.userRepo
        .findByIds(teacherIds, {
          code: 1,
          name: 1,
          email: 1,
          phone: 1,
          'teacherDetail.degree': 1,
        })
        .lean()
        .exec();
      return teachers;
    } catch (error) {
      this.logger.error('Error in findTeacherByCourseId service', error);
      throw error;
    }
  }
}
