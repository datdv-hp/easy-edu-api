import { sto, stos } from '@/common/helpers/common.functions.helper';
import {
  PromotionSetting,
  PromotionUtilization,
} from '@/database/mongo-schemas';
import {
  PromotionSettingRepository,
  PromotionUtilizationRepository,
} from '@/database/repositories';
import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { get } from 'lodash';
import { FilterQuery, PipelineStage } from 'mongoose';
import { MongoCollection, OrderDirection } from 'src/common/constants';
import { BaseService } from 'src/common/services/base.service';
import dayjs from 'src/plugins/dayjs';
import { addStatusFieldPipelineStage } from './promotion-setting.helper';
import {
  IPromotionSettingCreateBody,
  IPromotionSettingListFilter,
  IPromotionSettingUpdateBody,
  IPromotionUtilizationListFilter,
} from './promotion-setting.interfaces';

@Injectable({ scope: Scope.REQUEST })
export class PromotionSettingService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: PromotionSettingRepository,
    private readonly promotionUtilizationRepo: PromotionUtilizationRepository,
  ) {
    super(PromotionSettingService.name, configService);
  }

  async findAllAndCount(params: IPromotionSettingListFilter) {
    try {
      const { orderBy, orderDirection, skip, limit } = params;
      const filter: FilterQuery<PromotionSetting> = { $and: [] };
      if (params.keyword) {
        filter.$and.push({
          $or: [
            { name: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$value' },
                  regex: params.keyword,
                  options: 'i',
                },
              },
            },
          ],
        });
      }
      if (params.courseIds?.length) {
        filter.$and.push({
          applyForCourseIds: {
            $in: stos(params.courseIds),
          },
        });
      }
      if (params.statuses?.length) {
        filter.$and.push({ status: { $in: params.statuses } });
      }
      if (!filter.$and.length) {
        delete filter.$and;
      }

      const now = dayjs().toDate();
      const query: PipelineStage[] = [
        addStatusFieldPipelineStage(now),
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'applyForCourseIds',
            foreignField: '_id',
            as: 'courses',
            pipeline: [
              { $match: { deleted: false } },
              { $project: { name: 1 } },
            ],
          },
        },
        {
          $project: {
            name: 1,
            courseNames: '$courses.name',
            value: 1,
            type: 1,
            times: 1,
            usedTimes: 1,
            startAt: 1,
            endAt: 1,
            status: 1,
            createdAt: 1,
          },
        },
        {
          $facet: {
            data: [
              {
                $sort: {
                  [orderBy]: orderDirection === OrderDirection.ASC ? 1 : -1,
                },
              },
              { $skip: skip },
              { $limit: limit },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ];
      const data = await this.repo.model.aggregate(query).exec();

      const items = get(data, '[0].data', []);
      const totalItems = get(data, '0.total.0.count', 0) ?? 0;
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllAndCount: ', error);
      throw error;
    }
  }

  async findAllPromotionUtilizationsAndCount(
    params: IPromotionUtilizationListFilter & { promotionId: string },
  ) {
    try {
      const { orderBy, skip, limit } = params;
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const filter: FilterQuery<PromotionUtilization> = {
        promotionId: sto(params.promotionId),
      };
      const query: PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'studentId',
            foreignField: '_id',
            as: 'student',
            pipeline: [
              { $match: { deleted: false } },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $unwind: '$student' },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              { $match: { deleted: false } },
              { $project: { name: 1, code: 1 } },
            ],
          },
        },
        { $unwind: '$course' },
        {
          $project: { student: 1, course: 1 },
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
      const data = await this.promotionUtilizationRepo.model
        .aggregate(query)
        .exec();

      const items = get(data, '[0].data', []);
      const totalItems = get(data, '0.total.0.count', 0) ?? 0;
      return { items, totalItems };
    } catch (error) {
      this.logger.error(
        'Error in findAllPromotionUtilizationsAndCount service: ',
        error,
      );
      throw error;
    }
  }

  async create(
    params: IPromotionSettingCreateBody & {
      createdBy: string;
      updatedBy: string;
    },
  ) {
    try {
      const info = params.info;
      delete params.info;
      const promotion = await this.repo.create({ ...params, ...info });
      return promotion;
    } catch (error) {
      this.logger.error('Error in create service: ', error);
      throw error;
    }
  }

  async update(
    id: string,
    params: IPromotionSettingUpdateBody & {
      updatedBy: string;
    },
  ) {
    try {
      const info = params.info;
      delete params.info;
      const promotion = await this.repo.findByIdAndUpdate(id, {
        ...params,
        ...info,
      });
      return promotion;
    } catch (error) {
      this.logger.error('Error in create service: ', error);
      throw error;
    }
  }

  async findDetail(id: string) {
    try {
      const SELECT: FilterQuery<PromotionSetting> = {
        name: 1,
        description: 1,
        type: 1,
        value: 1,
        applyForCourseIds: 1,
        times: 1,
        startAt: 1,
        endAt: 1,
        createdAt: 1,
      };
      const detail = await this.repo.findById(id, SELECT).lean().exec();
      return detail;
    } catch (error) {
      this.logger.error('Error in findDetail service: ', error);
      throw error;
    }
  }

  async findMoreDetail(id: string) {
    try {
      const now = dayjs().toDate();
      const query: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        addStatusFieldPipelineStage(now),
        {
          $project: {
            name: 1,
            description: 1,
            type: 1,
            value: 1,
            times: 1,
            usedTimes: 1,
            startAt: 1,
            endAt: 1,
            status: 1,
          },
        },
      ];
      const promotion = await this.repo.model.aggregate(query).exec();
      return promotion[0];
    } catch (error) {
      this.logger.error('Error in findMoreDetail service: ', error);
      throw error;
    }
  }

  async bulkDelete(_ids: string[], deletedBy: string) {
    const session = await this.repo.model.startSession();

    try {
      session.startTransaction();
      const ids = stos(_ids);
      await this.repo.delete({ _id: { $in: ids } }, deletedBy).session(session);
      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();

      this.logger.error('Error in bulkDelete service: ', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
