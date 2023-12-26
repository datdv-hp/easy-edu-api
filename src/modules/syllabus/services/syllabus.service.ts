import { MongoCollection, OrderDirection, RoleType } from '@/common/constants';
import { sto } from '@/common/helpers/common.functions.helper';
import { IFilterBase } from '@/common/interfaces';
import { BaseService } from '@/common/services/base.service';
import { Syllabus } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  LectureRepository,
  LessonRepository,
  SyllabusHistoryRepository,
  SyllabusRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import {
  ISyllabusCreateFormData,
  ISyllabusFilter,
  ISyllabusUpdateFormData,
} from '../syllabus.interfaces';

@Injectable()
export class SyllabusService extends BaseService {
  constructor(
    private readonly repo: SyllabusRepository,
    private readonly classroomRepo: ClassroomRepository,
    private readonly syllabusHistoryRepo: SyllabusHistoryRepository,
    private readonly configService: ConfigService,
    private readonly lectureRepo: LectureRepository,
    private readonly lessonRepo: LessonRepository,
  ) {
    super(SyllabusService.name, configService);
  }

  private get model() {
    return this.repo.model;
  }

  async create(
    params: ISyllabusCreateFormData,
    createdBy: string,
  ): Promise<Syllabus> {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const createdSyllabus = await this.repo.create(
        {
          name: params.name,
          image: params.image,
          createdBy: sto(createdBy),
        },
        { session },
      );

      if (params?.lectures) {
        const lectures = params.lectures.map((lecture) => {
          return {
            ...lecture,
            createdBy,
            syllabusId: createdSyllabus.id,
          };
        });

        await this.lectureRepo.model.create(lectures, { session });
      }

      await session.commitTransaction();
      return createdSyllabus;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllWithPaging(
    dto: ISyllabusFilter,
    userInfo: { id: string; roleType: RoleType },
  ) {
    try {
      const { limit, skip, orderBy } = dto;
      const orderDirection = dto.orderDirection === OrderDirection.ASC ? 1 : -1;
      const filter: FilterQuery<Syllabus> = { $and: [] };
      if (userInfo.roleType === RoleType.TEACHER) {
        const classrooms = await this.classroomRepo
          .find({ teacherIds: userInfo.id }, { syllabusIds: 1 })
          .lean()
          .exec();
        const syllabusIdsSet = new Set<Types.ObjectId>();
        classrooms.forEach((classroom) => {
          classroom.syllabusIds.forEach((item) => syllabusIdsSet.add(item));
        });
        filter.$and.push({ _id: { $in: Array.from(syllabusIdsSet) } });
      }
      if (userInfo.roleType === RoleType.STUDENT) {
        const classrooms = await this.classroomRepo
          .find({ participantIds: userInfo.id }, { syllabusIds: 1 })
          .lean()
          .exec();
        const syllabusIdsSet = new Set<Types.ObjectId>();
        classrooms.forEach((classroom) => {
          classroom.syllabusIds.forEach((item) => syllabusIdsSet.add(item));
        });
        filter.$and.push({ _id: { $in: Array.from(syllabusIdsSet) } });
      }

      if (dto.keyword) {
        filter.$and.push({
          name: { $regex: `.*${dto?.keyword}.*`, $options: 'i' },
        });
      }
      if (!filter.$and.length) {
        delete filter.$and;
      }
      const pipelines: PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.LECTURES,
            localField: '_id',
            foreignField: 'syllabusId',
            as: 'lectures',
            pipeline: [
              { $match: { deleted: false } },
              { $project: { _id: 1 } },
            ],
          },
        },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy',
            pipeline: [{ $limit: 1 }],
          },
        },
        { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'updatedBy',
            foreignField: '_id',
            as: 'updatedBy',
            pipeline: [{ $limit: 1 }],
          },
        },
        { $unwind: { path: '$updatedBy', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            numberOfLectures: { $size: '$lectures' },
            createdAt: 1,
            createdBy: '$createdBy.name',
            updatedBy: '$updatedBy.name',
            updatedAt: 1,
            image: 1,
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
      const [result] = await this.model.aggregate(pipelines).exec();
      const items = result?.data || [];
      const totalItems = result?.total?.[0]?.count || 0;

      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging service', error);
      throw error;
    }
  }

  async getDetail(id: string) {
    try {
      const pipelines: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy',
            pipeline: [{ $limit: 1 }],
          },
        },
        { $unwind: '$createdBy' },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'updatedBy',
            foreignField: '_id',
            as: 'updatedBy',
            pipeline: [{ $limit: 1 }],
          },
        },
        { $unwind: { path: '$updatedBy', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: MongoCollection.LECTURES,
            localField: '_id',
            foreignField: 'syllabusId',
            as: 'lectures',
          },
        },
        {
          $project: {
            id: 1,
            name: 1,
            updatedAt: 1,
            createdAt: 1,
            updatedBy: '$updatedBy.name',
            createdBy: '$createdBy.name',
            image: 1,
          },
        },
        { $limit: 1 },
      ];
      const [result] = await this.model.aggregate(pipelines).exec();
      return result;
    } catch (error) {
      this.logger.error('Error in findOneById service', error);
    }
  }

  async getAllLecturesBySyllabusId(syllabusId: string, query: IFilterBase) {
    try {
      const orderDirection =
        query.orderDirection === OrderDirection.DESC ? 1 : -1;
      const pipelines: PipelineStage[] = [
        { $match: { syllabusId: sto(syllabusId) } },
        {
          $project: {
            name: 1,
            files: 1,
            referenceLinks: 1,
            createdAt: 1,
          },
        },
        {
          $facet: {
            data: [
              { $sort: { [query.orderBy]: orderDirection } },
              { $skip: query.skip },
              { $limit: query.limit },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ];
      const [result] = await this.lectureRepo.model.aggregate(pipelines).exec();
      const items = result?.data || [];
      const totalItems = result?.total?.[0]?.count || 0;
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in getAllLecturesBySyllabusId service', error);
      throw error;
    }
  }

  async findHistoryEditSyllabus(syllabusId: string, query: IFilterBase) {
    try {
      const orderDirection =
        query.orderDirection === OrderDirection.ASC ? 1 : -1;
      const pipelines: PipelineStage[] = [
        { $match: { syllabusId: sto(syllabusId) } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'createdBy',
            foreignField: '_id',
            as: 'updatedBy',
            pipeline: [{ $limit: 1 }],
          },
        },
        { $unwind: '$updatedBy' },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            updatedBy: '$updatedBy.name',
            note: 1,
          },
        },
        {
          $facet: {
            data: [
              { $sort: { [query.orderBy]: orderDirection } },
              { $skip: query.skip },
              { $limit: query.limit },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ];
      const [result] = await this.syllabusHistoryRepo.model
        .aggregate(pipelines)
        .exec();

      const items = result?.data || [];
      const totalItems = result?.total?.[0]?.count || 0;
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findHistoryEditSyllabus service', error);
      throw error;
    }
  }

  async update(
    id: string,
    params: ISyllabusUpdateFormData,
    updatedBy: Types.ObjectId,
  ): Promise<Syllabus> {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const syllabus = await this.model
        .findByIdAndUpdate(
          id,
          { ...params, updatedBy },
          {
            new: true,
            runValidators: true,
          },
        )
        .session(session);

      // add history edit syllabus
      await this.syllabusHistoryRepo.create(
        {
          syllabusId: sto(id),
          note: this.i18n.translate('syllabus.updateSyllabus'),
          createdBy: updatedBy,
        },
        { session },
      );

      await session.commitTransaction();
      return syllabus;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in update service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteManyIds(ids: string[], deletedBy: string): Promise<boolean> {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      await this.repo.delete({ _id: { $in: ids } }, deletedBy).session(session);

      const lectures = await this.model.find({ syllabusId: { $in: ids } });
      const lectureIds = lectures.map((lecture) => lecture._id);

      await this.lectureRepo
        .delete({ syllabusId: { $in: ids } }, deletedBy)
        .session(session)
        .lean()
        .exec();

      await this.lessonRepo
        .updateMany(
          { lectureIds: { $in: lectureIds } },
          { $pullAll: { lectureIds: lectureIds } },
        )
        .session(session)
        .lean()
        .exec();

      await this.classroomRepo
        .updateMany(
          { syllabusIds: { $in: ids } },
          { $pullAll: { syllabusIds: ids } },
        )
        .session(session)
        .lean()
        .exec();

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
