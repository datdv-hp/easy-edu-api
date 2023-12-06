import {
  DateFormat,
  MongoCollection,
  OrderDirection,
  RoleType,
} from '@/common/constants';
import { sto, stos } from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { CodePrefix, DELETE_COND, LessonStatus } from '@/database/constants';
import { Lesson } from '@/database/mongo-schemas';
import {
  LessonAbsentRepository,
  LessonRepository,
  TimekeepingRepository,
} from '@/database/repositories';
import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery, PipelineStage } from 'mongoose';
import { generateNextLessonCode } from './lesson.helpers';
import {
  ILessonFilter,
  ILessonScheduleQuery,
  ILessonUpdateForm,
} from './lesson.interfaces';
import { IContext } from '@/common/interfaces';
import { forEach } from 'lodash';

@Injectable()
export class LessonService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: LessonRepository,
    private readonly lessonAbsentRepo: LessonAbsentRepository,
    private readonly timekeepingRepo: TimekeepingRepository,
  ) {
    super(LessonService.name, configService);
  }

  private get model() {
    return this.repo.model;
  }

  async createMany(data: Partial<Lesson>[]) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const lastLesson = await this.repo.findLatestLessonOfYear().lean().exec();
      const lessonCode = lastLesson?.code || undefined;
      const prefix = `${CodePrefix.LESSON}${dayjs().year()}`;
      const maxCode = lessonCode ? +lessonCode.substring(prefix.length) : 0;
      const query = data.map((lesson, index) => {
        const code = generateNextLessonCode(maxCode + index);
        const lessonName =
          data.length > 1 ? `${lesson.name} - ${index + 1}` : lesson.name;
        return {
          insertOne: {
            document: {
              ...lesson,
              code,
              createdAt: dayjs().toISOString(),
              name: lessonName,
            },
          },
        };
      });

      const result = await this.model.bulkWrite(query, { session });
      await session.commitTransaction();
      return result.ok;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllAndCount(
    params: ILessonFilter,
    roleType: string,
    userId: string,
  ) {
    const now = dayjs();
    const date = now.format(DateFormat.YYYY_MM_DD_HYPHEN);
    const time = now.format(DateFormat.HH_mm_COLON);
    const filter: FilterQuery<Lesson> = { $and: [] };
    const orderDirection =
      params.orderDirection === OrderDirection.ASC ? 1 : -1;
    if (params.keyword) {
      filter.$and.push({
        $or: [
          { code: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
          { name: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
        ],
      });
    }
    if (params?.classroomIds?.length) {
      filter.$and.push({ classroomId: { $in: stos(params.classroomIds) } });
    }
    if (roleType === RoleType.TEACHER) {
      filter.$and.push({ teacherId: sto(userId) });
    }
    if (roleType === RoleType.STUDENT) {
      filter.$and.push({ studentIds: sto(userId) });
    }
    if (params.statuses?.length) {
      filter.$and.push({ status: { $in: params.statuses } });
    }
    if (!filter.$and.length) {
      delete filter.$and;
    }
    const query: PipelineStage[] = [
      {
        $addFields: {
          status: {
            $cond: {
              if: {
                $or: [
                  { $lt: ['$date', date] },
                  {
                    $and: [
                      { $lt: ['$endTime', time] },
                      { $eq: ['$date', date] },
                    ],
                  },
                ],
              },
              then: LessonStatus.COMPLETED,
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$date', date] },
                      { $lt: ['$startTime', time] },
                      { $gt: ['$endTime', time] },
                    ],
                  },
                  then: LessonStatus.ONGOING,
                  else: LessonStatus.UPCOMING,
                },
              },
            },
          },
        },
      },
      { $match: filter },
      {
        $lookup: {
          from: MongoCollection.CLASSROOMS,
          localField: 'classroomId',
          foreignField: '_id',
          as: 'classroom',
          pipeline: [
            { $match: DELETE_COND },
            { $limit: 1 },
            { $project: { name: 1 } },
          ],
        },
      },
      { $unwind: '$classroom' },
      {
        $lookup: {
          from: MongoCollection.SUBJECTS,
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject',
          pipeline: [
            { $match: DELETE_COND },
            { $limit: 1 },
            { $project: { name: 1 } },
          ],
        },
      },
      {
        $unwind: { path: '$subject', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: MongoCollection.USERS,
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher',
          pipeline: [
            { $match: DELETE_COND },
            { $limit: 1 },
            { $project: { name: 1 } },
          ],
        },
      },
      { $unwind: '$teacher' },
      {
        $lookup: {
          from: MongoCollection.COURSES,
          localField: 'courseId',
          foreignField: '_id',
          as: 'course',
        },
      },
      {
        $unwind: '$course',
      },
      {
        $lookup: {
          from: MongoCollection.USERS,
          localField: 'studentIds',
          foreignField: '_id',
          as: 'students',
          pipeline: [{ $match: DELETE_COND }, { $project: { name: 1 } }],
        },
      },
      {
        $project: {
          code: 1,
          name: 1,
          date: 1,
          startTime: 1,
          endTime: 1,
          classroom: 1,
          subject: 1,
          students: 1,
          teacher: 1,
          course: 1,
          createdAt: 1,
        },
      },
      {
        $facet: {
          data: [
            { $sort: { code: orderDirection } },
            { $skip: params.skip },
            { $limit: params.limit },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];
    const [result] = await this.model.aggregate(query).exec();

    const items = result.data || [];
    const totalItems = result.total[0]?.count || 0;
    return { items, totalItems };
  }

  async getSchedule(
    params: ILessonScheduleQuery & { studentId?: string },
    context: IContext,
  ) {
    try {
      const filter: FilterQuery<Lesson> = { $and: [] };
      if (context.roleType === RoleType.TEACHER) {
        params.teacherIds = [context.user.id];
      }
      if (context.roleType === RoleType.STUDENT) {
        params.studentId = context.user.id;
      }
      if (params.classroomIds?.length) {
        filter.$and.push({ classroomId: { $in: stos(params.classroomIds) } });
      }
      if (params.teacherIds?.length) {
        filter.$and.push({ teacherId: { $in: stos(params.teacherIds) } });
      }
      if (params.subjectIds?.length) {
        filter.$and.push({ subjectId: { $in: stos(params.subjectIds) } });
      }
      if (params.studentId) {
        filter.$and.push({ studentIds: sto(params.studentId) });
      }
      if (params.startDate) {
        filter.$and.push({ date: { $gte: params.startDate } });
      }
      if (params.endDate) {
        filter.$and.push({ date: { $lte: params.endDate } });
      }
      if (!filter.$and.length) {
        delete filter.$and;
      }

      const query: PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.CLASSROOMS,
            localField: 'classroomId',
            foreignField: '_id',
            pipeline: [{ $project: { name: 1, color: 1 } }],
            as: 'classroom',
          },
        },
        { $unwind: '$classroom' },
        {
          $project: {
            date: 1,
            startTime: 1,
            endTime: 1,
            classroom: 1,
            name: 1,
            code: 1,
            room: 1,
            meetUrl: 1,
            isUserGoogleMeet: 1,
          },
        },
      ];
      const lessons = await this.model.aggregate(query).exec();
      return lessons;
    } catch (error) {
      this.logger.error('Error in getSchedule service', error);
      throw error;
    }
  }

  async findLessonDetail(id: string) {
    try {
      const now = dayjs();
      const date = now.format(DateFormat.YYYY_MM_DD_HYPHEN);
      const time = now.format(DateFormat.HH_mm_COLON);
      const query: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        {
          $lookup: {
            from: MongoCollection.CLASSROOMS,
            localField: 'classroomId',
            foreignField: '_id',
            as: 'classroom',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $unwind: '$classroom' },
        {
          $lookup: {
            from: MongoCollection.SUBJECTS,
            localField: 'subjectId',
            foreignField: '_id',
            as: 'subject',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        {
          $unwind: { path: '$subject' },
        },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'teacherId',
            foreignField: '_id',
            as: 'teacher',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $unwind: '$teacher' },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        {
          $unwind: '$course',
        },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'studentIds',
            foreignField: '_id',
            as: 'students',
            pipeline: [
              { $match: DELETE_COND },
              { $project: { name: 1, code: 1, avatar: 1 } },
            ],
          },
        },
        {
          $lookup: {
            from: MongoCollection.SYLLABUS,
            localField: 'syllabusId',
            foreignField: '_id',
            as: 'syllabus',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$syllabus', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: MongoCollection.LECTURES,
            localField: 'lectureIds',
            foreignField: '_id',
            as: 'lectures',
            pipeline: [
              { $match: DELETE_COND },
              { $project: { name: 1, files: 1, referenceLinks: 1 } },
            ],
          },
        },
        {
          $addFields: {
            status: {
              $cond: {
                if: {
                  $or: [
                    { $lt: ['$date', date] },
                    {
                      $and: [
                        { $lt: ['$endTime', time] },
                        { $eq: ['$date', date] },
                      ],
                    },
                  ],
                },
                then: LessonStatus.COMPLETED,
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$date', date] },
                        { $lt: ['$startTime', time] },
                        { $gt: ['$endTime', time] },
                      ],
                    },
                    then: LessonStatus.ONGOING,
                    else: LessonStatus.UPCOMING,
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            name: 1,
            teacher: 1,
            classroom: 1,
            course: 1,
            students: 1,
            subject: 1,
            room: 1,
            code: 1,
            meetUrl: 1,
            date: 1,
            startTime: 1,
            endTime: 1,
            documents: 1,
            recordings: 1,
            isUseGoogleMeet: 1,
            lectureIds: 1,
            lectures: 1,
            syllabusId: 1,
            syllabus: 1,
            status: 1,
          },
        },
      ];
      const [lesson] = await this.model.aggregate(query).exec();
      return lesson;
    } catch (error) {
      this.logger.error('Error in findLessonMoreDetail: ', error);
      throw error;
    }
  }

  async FindLessonMoreDetail(id: string) {
    try {
      const now = dayjs();
      const date = now.format(DateFormat.YYYY_MM_DD_HYPHEN);
      const time = now.format(DateFormat.HH_mm_COLON);
      const query: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        {
          $lookup: {
            from: MongoCollection.CLASSROOMS,
            localField: 'classroomId',
            foreignField: '_id',
            as: 'classroom',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $unwind: '$classroom' },
        {
          $lookup: {
            from: MongoCollection.SUBJECTS,
            localField: 'subjectId',
            foreignField: '_id',
            as: 'subject',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        {
          $unwind: { path: '$subject' },
        },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'teacherId',
            foreignField: '_id',
            as: 'teacher',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $unwind: '$teacher' },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        {
          $unwind: '$course',
        },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'studentIds',
            foreignField: '_id',
            as: 'students',
            pipeline: [
              { $match: DELETE_COND },
              { $project: { name: 1, code: 1, avatar: 1 } },
            ],
          },
        },
        {
          $lookup: {
            from: MongoCollection.SYLLABUS,
            localField: 'syllabusId',
            foreignField: '_id',
            as: 'syllabus',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$syllabus', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: MongoCollection.LECTURES,
            localField: 'lectureIds',
            foreignField: '_id',
            as: 'lectures',
            pipeline: [
              { $match: DELETE_COND },
              { $project: { name: 1, files: 1, referenceLinks: 1 } },
            ],
          },
        },
        {
          $addFields: {
            status: {
              $cond: {
                if: {
                  $or: [
                    { $lt: ['$date', date] },
                    {
                      $and: [
                        { $lt: ['$endTime', time] },
                        { $eq: ['$date', date] },
                      ],
                    },
                  ],
                },
                then: LessonStatus.COMPLETED,
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$date', date] },
                        { $lt: ['$startTime', time] },
                        { $gt: ['$endTime', time] },
                      ],
                    },
                    then: LessonStatus.ONGOING,
                    else: LessonStatus.UPCOMING,
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            name: 1,
            teacher: 1,
            classroom: 1,
            course: 1,
            students: 1,
            subject: 1,
            room: 1,
            code: 1,
            meetUrl: 1,
            date: 1,
            startTime: 1,
            endTime: 1,
            documents: 1,
            recordings: 1,
            isUseGoogleMeet: 1,
            lectureIds: 1,
            lectures: 1,
            syllabusId: 1,
            syllabus: 1,
            status: 1,
          },
        },
      ];
      const [lesson] = await this.model.aggregate(query).exec();

      // Get timekeeping info, lesson absent
      const studentIds = lesson.students.map((student) => student._id);
      const userIds = [...studentIds, lesson.teacher._id];
      const [lessonAbsents, timekeepings] = await Promise.all([
        this.lessonAbsentRepo
          .find(
            { userId: { $in: userIds }, lessonId: lesson._id },
            { userId: 1, lessonId: 1, reason: 1, status: 1 },
          )
          .lean()
          .exec(),
        this.timekeepingRepo
          .find(
            { lessonId: lesson._id, userId: { $in: userIds } },
            { lessonId: 1, userId: 1, isAttended: 1 },
          )
          .lean()
          .exec(),
      ]);
      const lessonAbsentsMapByUserId = Object.fromEntries(
        lessonAbsents.map((item) => [item.userId.toString(), item]),
      );
      const timekeepingsMapByUserId = Object.fromEntries(
        timekeepings.map((item) => [item.userId.toString(), item]),
      );

      forEach(lesson.students, (student) => {
        Object.assign(student, {
          leave: lessonAbsentsMapByUserId[student._id.toString()],
          timekeeping: timekeepingsMapByUserId[student._id.toString()],
        });
      });
      Object.assign(lesson.teacher, {
        timekeeping: timekeepingsMapByUserId[lesson.teacher._id.toString()],
      });
      return lesson;
    } catch (error) {
      this.logger.error('Error in findLessonMoreDetail: ', error);
      throw error;
    }
  }

  async findAnotherLessonByField(params: {
    classroomId?: string;
    teacherId?: string;
    lessonId: string;
    date: string;
    startTime: string;
    endTime: string;
  }) {
    const query: FilterQuery<Lesson> = {
      date: params.date,
      _id: {
        $ne: sto(params.lessonId),
      },
      startTime: { $lte: params.endTime },
      endTime: { $gte: params.startTime },
    };
    if (params.classroomId) {
      query.classroomId = sto(params.classroomId);
    }
    if (params.teacherId) {
      query.teacherId = sto(params.teacherId);
    }
    return await this.model.findOne(query, { _id: 1 }).lean().exec();
  }

  async update(
    id: string,
    params: ILessonUpdateForm & { updatedBy: string; meetUrl?: string },
  ) {
    try {
      await this.model.updateOne({ _id: sto(id) }, params, {
        new: true,
        runValidators: true,
      });
      const result = await this.findLessonDetail(id);
      return result;
    } catch (error) {
      this.logger.error('Error in LessonService update: ', error);
      throw error;
    }
  }

  async deleteManyIds(ids: string[], deletedBy: string) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      await this.model
        .delete({ _id: { $in: ids } }, deletedBy)
        .session(session);
      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in deleteManyIds update: ', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
