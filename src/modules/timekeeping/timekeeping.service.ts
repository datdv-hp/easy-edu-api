import { MongoCollection, OrderDirection } from '@/common/constants';
import { sto, stos } from '@/common/helpers/common.functions.helper';
import { IContext } from '@/common/interfaces';
import { BaseService } from '@/common/services/base.service';
import { User } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  LessonRepository,
  TimekeepingRepository,
  UserRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { filter, forEach, uniq } from 'lodash';
import { FilterQuery } from 'mongoose';
import {
  IFilterListTeacher,
  IFilterListTeacherTimekeeping,
  ITimekeepingCreateFormData,
  ITimekeepingUpdateFormData,
} from './timekeeping.interface';

@Injectable()
export class TimekeepingService extends BaseService {
  constructor(
    protected configService: ConfigService,
    private readonly userRepo: UserRepository,
    private readonly repo: TimekeepingRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly classroomRepo: ClassroomRepository,
  ) {
    super(TimekeepingService.name, configService);
  }

  async findTeacherHaveTimekeeping(params: IFilterListTeacher) {
    try {
      const { limit, skip, keyword, orderBy, userIds, startDate, endDate } =
        params;
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;

      const userQuery: FilterQuery<User> = { $and: [] };
      if (userIds?.length) {
        userQuery.$and.push({ _id: { $in: stos(userIds) } });
      }
      if (keyword) {
        userQuery.$and.push({
          $or: [
            { code: { $regex: `.*${keyword}.*`, $options: 'i' } },
            { name: { $regex: `.*${keyword}.*`, $options: 'i' } },
          ],
        });
      }
      if (!userQuery.$and.length) {
        delete userQuery.$and;
      }
      // Get all teacher has at least 1 lesson in the time range, normal is 1 month
      const [result] = await this.userRepo.model.aggregate([
        { $match: userQuery },
        {
          $lookup: {
            from: MongoCollection.LESSONS,
            localField: '_id',
            foreignField: 'teacherId',
            pipeline: [
              {
                $match: {
                  date: { $gte: startDate, $lte: endDate },
                  deleted: false,
                },
              },
              { $project: { _id: 1, name: 1 } },
            ],
            as: 'lessons',
          },
        },
        { $match: { lessons: { $ne: [] } } },
        {
          $project: {
            code: 1,
            name: 1,
            lessons: 1,
            totalLessons: { $size: '$lessons' },
            createdAt: 1,
          },
        },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit },
              { $sort: { [orderBy]: orderDirection } },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ]);
      const teachers = result.data || [];
      const totalItems = result.total[0]?.count || 0;
      // Get timekeeping info of each teacher
      const lessonIdsSet = new Set<string>();
      forEach(teachers, (teacher) =>
        teacher.lessons.forEach((lesson) =>
          lessonIdsSet.add(lesson._id.toString()),
        ),
      );
      const timekeepingInfos = await this.repo
        .find(
          { lessonId: { $in: Array.from(lessonIdsSet) } },
          { isAttended: 1, userId: 1 },
        )
        .lean()
        .exec();

      forEach(teachers, (teacher) => {
        teacher.countCheckIn = filter(timekeepingInfos, (timekeeping) => {
          return (
            timekeeping.isAttended &&
            timekeeping.userId.toString() === teacher._id.toString()
          );
        }).length;
        delete teacher.lessons;
      });
      return { items: teachers, totalItems };
    } catch (error) {
      this.logger.error('Error in findTeacher: ', error);
      throw error;
    }
  }

  async findTimekeepingByTeacher(
    userId: string,
    query: IFilterListTeacherTimekeeping,
  ) {
    try {
      const { startDate, endDate } = query;
      const lessons = await this.lessonRepo
        .find(
          { teacherId: userId, date: { $gte: startDate, $lte: endDate } },
          { _id: 1, name: 1, code: 1, date: 1, classroomId: 1 },
        )
        .lean()
        .exec();
      const lessonIds = lessons.map((lesson) => lesson._id);
      const timekeepings = await this.repo
        .find({ userId, lessonId: { $in: lessonIds } })
        .lean()
        .exec();

      const timekeepingsObject = {};
      forEach(timekeepings, (timekeeping) => {
        timekeepingsObject[timekeeping.lessonId.toString()] = timekeeping;
      });
      const classroomIds = lessons.map((lesson) =>
        lesson.classroomId.toString(),
      );
      const classrooms = await this.classroomRepo
        .find({ _id: { $in: uniq(classroomIds) } }, { _id: 1, name: 1 })
        .lean()
        .exec();

      forEach(lessons, (lesson) => {
        Object.assign(lesson, {
          isAttended:
            timekeepingsObject[lesson._id.toString()]?.isAttended || false,
          timekeepingId:
            timekeepingsObject[lesson._id.toString()]?._id?.toString() || null,
        });
      });
      forEach(classrooms, (classroom) => {
        const _lessons = filter(
          lessons,
          (lesson) =>
            lesson.classroomId.toString() === classroom._id.toString(),
        );
        Object.assign(classroom, { lessons: _lessons });
      });
      return classrooms;
    } catch (error) {
      throw error;
    }
  }

  async updateOrCreateManyIfNotExist(
    params: ITimekeepingCreateFormData[],
    context?: IContext,
  ) {
    const session = await this.repo.model.startSession();
    try {
      session.startTransaction();
      const query = params.map((item) => {
        return {
          updateOne: {
            filter: {
              userId: item.userId,
              lessonId: item.lessonId,
            },
            update: { $set: { ...item, createdBy: context.user.id } },
            upsert: true,
          },
        };
      });
      const result = await this.repo.model.bulkWrite(query, { session });
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createIfNotExist(
    params: ITimekeepingCreateFormData,
    context?: IContext,
  ) {
    try {
      const { userId, lessonId } = params;
      const createdTimeKeeping = await this.repo
        .findOneAndUpdate(
          { userId, lessonId },
          {
            ...params,
            createdBy: context.user.id,
            updatedBy: context.user.id,
          },
          { upsert: true, new: true },
        )
        .select({ _id: 1, lessonId: 1, userId: 1, isAttended: 1 })
        .lean()
        .exec();
      return createdTimeKeeping;
    } catch (error) {
      this.logger.error('Error in createIfNotExist: ', error);
      throw error;
    }
  }

  async update(id: string, params: ITimekeepingUpdateFormData) {
    try {
      const result = await this.repo.findByIdAndUpdate(
        id,
        { isAttended: params.isAttended },
        { new: true, runValidators: true },
      );

      return result;
    } catch (error) {
      this.logger.error('Error in update: ', error);
      throw error;
    }
  }

  async create(params: ITimekeepingCreateFormData, context?: IContext) {
    try {
      const createdTimeKeeping = await this.repo.create({
        userId: sto(params.userId),
        lessonId: sto(params.lessonId),
        isAttended: params.isAttended,
        createdBy: sto(context.user.id),
      });

      return {
        _id: createdTimeKeeping._id,
        userId: createdTimeKeeping.userId,
        lessonId: createdTimeKeeping.lessonId,
        isAttended: createdTimeKeeping.isAttended,
      };
    } catch (error) {
      this.logger.error('Error in create: ', error);
      throw error;
    }
  }
}
