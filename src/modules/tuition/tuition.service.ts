import {
  PromotionSettingRepository,
  PromotionUtilizationRepository,
  TuitionPaymentHistoryRepository,
  TuitionRepository,
} from '@/database/repositories';
import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { difference, forEach, get } from 'lodash';
import { ClientSession, FilterQuery, PipelineStage, Types } from 'mongoose';
import { MongoCollection, OrderDirection } from 'src/common/constants';
import { BaseService } from 'src/common/services/base.service';
import dayjs from 'src/plugins/dayjs';
import { TuitionStatus } from './tuition.constant';
import {
  IFilterTuitionList,
  IFilterTuitionPaymentHistory,
  ITuitionPaymentBody,
  IUpdateTuitionInfoBody,
} from './tuition.interface';
import { Tuition, TuitionPromotionInfo } from '@/database/mongo-schemas';
import { sto, stos } from '@/common/helpers/common.functions.helper';
import { PromotionType } from '@/database/constants';

@Injectable()
export class TuitionService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly tuitionRepo: TuitionRepository,
    private readonly tuitionPaymentHistoryRepo: TuitionPaymentHistoryRepository,
    private readonly promotionUtilizationRepo: PromotionUtilizationRepository,
    private readonly promotionSettingRepo: PromotionSettingRepository,
  ) {
    super(TuitionService.name, configService);
  }

  async findAllAndCount(condition: IFilterTuitionList, userIds?: string[]) {
    try {
      const filter: FilterQuery<Tuition> = { $and: [] };
      if (userIds?.length) {
        filter.$and.push({ userId: { $in: stos(userIds) } });
      }
      if (condition?.classroomIds?.length) {
        filter.$and.push({
          classroomId: { $in: stos(condition.classroomIds) },
        });
      }
      if (condition?.startAt) {
        filter.$and.push({
          paymentStartDate: { $gte: dayjs(condition.startAt).toDate() },
        });
      }

      if (condition?.endAt) {
        filter.$and.push({
          paymentEndDate: {
            $lte: dayjs(condition.endAt).endOf('day').toDate(),
          },
        });
      }

      if (condition?.presenterIds?.length) {
        filter.$and.push({
          presenterId: { $in: stos(condition.presenterIds) },
        });
      }

      if (condition?.statuses) {
        const hasOverdue = condition.statuses.includes(TuitionStatus.OVER_DUE);
        if (hasOverdue) {
          const now = dayjs().toDate();
          const statuses = condition.statuses.filter(
            (item) => item !== TuitionStatus.OVER_DUE,
          );
          filter.$and.push({
            $or: [
              {
                status: { $ne: TuitionStatus.COMPLETED },
                paymentEndDate: { $lt: now },
              },
              { status: { $in: statuses } },
            ],
          });
        } else {
          filter.$and.push({ status: { $in: condition.statuses } });
        }
      }

      if (condition?.keyword) {
        filter.$and.push({
          'student.name': { $regex: `.*${condition.keyword}.*`, $options: 'i' },
        });
      }

      const orderDirection =
        condition.orderDirection === OrderDirection.ASC ? 1 : -1;

      if (!filter.$and.length) {
        delete filter.$and;
      }
      const data = await this.tuitionRepo.model.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.CLASSROOMS,
            localField: 'classroomId',
            foreignField: '_id',
            as: 'classroom',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$classroom' } },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$course' } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'student',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$student' } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'presenterId',
            foreignField: '_id',
            as: 'presenter',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$presenter', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            code: 1,
            originalValue: 1,
            promotionValue: 1,
            payValue: 1,
            paidValue: 1,
            shortageValue: 1,
            paymentDate: 1,
            paymentStartDate: 1,
            paymentEndDate: 1,
            status: 1,
            classroom: 1,
            course: 1,
            student: 1,
            presenter: 1,
          },
        },
        {
          $facet: {
            data: [
              { $sort: { code: orderDirection } },
              { $skip: condition.skip },
              { $limit: condition.limit },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ]);
      const _data = get(data, '[0].data', []);
      const count = get(data, '0.total.0.count', 0) ?? 0;

      return [this._NewDataWithUpdateStatusTuition(_data), count];
    } catch (error) {
      this.logger.error('Error in findAllAndCount service: ', error);
    }
  }

  async getDetailBasicInfoFeeOfStudent(id: string) {
    try {
      const data = await this.tuitionRepo.model.aggregate([
        { $match: { _id: sto(id) } },
        { $limit: 1 },
        {
          $lookup: {
            from: MongoCollection.CLASSROOMS,
            localField: 'classroomId',
            foreignField: '_id',
            as: 'classroom',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$classroom' } },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$course' } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'student',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$student' } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'presenterId',
            foreignField: '_id',
            as: 'presenter',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$presenter', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            code: 1,
            originalValue: 1,
            promotions: 1,
            promotionValue: 1,
            payValue: 1,
            paidValue: 1,
            shortageValue: 1,
            paymentDate: 1,
            paymentStartDate: 1,
            paymentEndDate: 1,
            status: 1,
            classroom: 1,
            course: 1,
            student: 1,
            presenter: 1,
          },
        },
      ]);

      const [tuition] = this._NewDataWithUpdateStatusTuition(data);
      return tuition;
    } catch (error) {
      this.logger.error('Error in getDetailBasicInfoFeeOfStudent: ', error);
    }
  }

  async createTuitionPayment(
    tuitionInfo: {
      id: Types.ObjectId;
      shortageValue: number;
    },
    body: ITuitionPaymentBody & { createdBy: string; updatedBy: string },
  ) {
    const session = await this.tuitionRepo.model.startSession();
    try {
      session.startTransaction();
      const status =
        tuitionInfo.shortageValue - body.value > 0
          ? TuitionStatus.PARTIAL_PAID
          : TuitionStatus.COMPLETED;
      await this.tuitionRepo.updateOne(
        { _id: tuitionInfo.id },
        {
          $inc: { paidValue: body.value, shortageValue: -body.value },
          $set: { status: status },
        },
        { session, new: true },
      );
      await this._CreatePaymentHistory(tuitionInfo.id, body, session);
      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in createTuitionPayment service: ', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateTuitionInfo(
    tuitionInfo: {
      id: string;
      originalValue: number;
      classroomId: Types.ObjectId;
      courseId: Types.ObjectId;
      userId: Types.ObjectId;
    },
    params: IUpdateTuitionInfoBody & {
      updatedBy: string;
      oldPromotionIds?: string[];
    },
    updatedPromotionsObject?: Record<string, TuitionPromotionInfo>,
  ) {
    const session = await this.tuitionRepo.model.startSession();
    try {
      session.startTransaction();
      const updateForm = {
        updatedBy: params.updatedBy,
        paymentStartDate: params.payment?.startDate,
        paymentEndDate: params.payment?.endDate,
      };
      const { id: tuitionId, originalValue } = tuitionInfo;
      let updatedTuitionPromotions: TuitionPromotionInfo[];
      let remainValue = originalValue;
      if (params.promotions) {
        // Recalculate promotion value, shortage value, pay value
        const sortedPromotions = params.promotions.sort(
          (a, b) => a.priority - b.priority,
        );
        updatedTuitionPromotions = sortedPromotions.map((_promotion) => {
          const id = _promotion.id;
          const promotion = updatedPromotionsObject[id];
          const finalValue =
            promotion.type === PromotionType.PERCENTAGE
              ? remainValue * (promotion.value / 100)
              : promotion.value;
          remainValue = Math.max(0, remainValue - finalValue);

          return {
            _id: sto(id),
            finalValue,
            value: promotion.value,
            type: promotion.type,
            priority: promotion.priority,
            name: promotion.name,
          };
        });

        Object.assign(updateForm, {
          payValue: remainValue,
          shortageValue: remainValue,
          promotionValue: originalValue - remainValue,
          promotions: updatedTuitionPromotions,
          status: remainValue === 0 ? TuitionStatus.COMPLETED : undefined,
        });
      }

      const updatedTuition = await this.tuitionRepo
        .findByIdAndUpdate(tuitionId, updateForm, {
          new: true,
          runValidators: true,
          lean: true,
          session,
        })
        .exec();

      const updatePromotionIds = params.promotions?.map(
        (promotion) => promotion.id,
      );
      const newPromotionIds = difference(
        updatePromotionIds || [],
        params.oldPromotionIds || [],
      );
      const removePromotionIds = difference(
        params.oldPromotionIds || [],
        updatePromotionIds || [],
      );
      if (newPromotionIds?.length) {
        await this._CreatePromotionUtilizationInfo(
          {
            classroomId: tuitionInfo.classroomId,
            courseId: tuitionInfo.courseId,
            studentId: tuitionInfo.userId,
            promotionIds: newPromotionIds,
            createdBy: params.updatedBy,
          },
          session,
        );
        await this.promotionSettingRepo.model.updateMany(
          { _id: { $in: newPromotionIds } },
          { $inc: { usedTimes: 1 } },
          { session },
        );
      }
      if (removePromotionIds.length) {
        await this._RemovePromotionUtilizationInfo(
          {
            classroomId: tuitionInfo.classroomId,
            studentId: tuitionInfo.userId,
            promotionIds: removePromotionIds,
          },
          params.updatedBy,
          session,
        );
        await this.promotionSettingRepo.model.updateMany(
          { _id: { $in: removePromotionIds } },
          { $inc: { usedTimes: -1 } },
          { session },
        );
      }
      await session.commitTransaction();
      return updatedTuition;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in updateTuitionInfo service: ', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllTuitionPaymentAndCount(
    tuitionId: string,
    params: IFilterTuitionPaymentHistory,
  ) {
    try {
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const query: PipelineStage[] = [
        { $match: { tuitionId: sto(tuitionId) } },
        {
          $lookup: {
            from: MongoCollection.PAYMENT_METHOD_SETTINGS,
            localField: 'paymentMethodId',
            foreignField: '_id',
            as: 'paymentMethod',
            pipeline: [
              { $match: { deleted: false } },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        {
          $unwind: { path: '$paymentMethod', preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            value: 1,
            method: '$paymentMethod.name',
            paymentDate: 1,
            createdAt: 1,
          },
        },
        {
          $facet: {
            data: [
              { $sort: { [params.orderBy]: orderDirection } },
              { $skip: params.skip },
              { $limit: params.limit },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ];
      const data = await this.tuitionPaymentHistoryRepo.model
        .aggregate(query)
        .exec();
      const items = get(data, '[0].data', []);
      const totalItems = get(data, '0.total.0.count', 0);
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllTuitionPayment service: ', error);
      throw error;
    }
  }

  private _NewDataWithUpdateStatusTuition(data: any[]) {
    forEach(data, (item) => {
      if (
        item.status !== TuitionStatus.COMPLETED &&
        dayjs(item.paymentEndDate).isBefore()
      ) {
        item.status = TuitionStatus.OVER_DUE;
      }
    });

    return data;
  }

  private async _CreatePromotionUtilizationInfo(
    params: {
      promotionIds: string[];
      classroomId: Types.ObjectId;
      courseId: Types.ObjectId;
      studentId: Types.ObjectId;
      createdBy: string;
    },
    session: ClientSession,
  ) {
    try {
      const promotionUtilizations = params.promotionIds.map((id) => ({
        studentId: params.studentId,
        promotionId: id,
        courseId: params.courseId,
        classroomId: params.classroomId,
        createdBy: params.createdBy,
        updatedBy: params.createdBy,
      }));
      await this.promotionUtilizationRepo.model.create(promotionUtilizations, {
        session,
      });
    } catch (error) {
      this.logger.error('Error in _CreatePromotionUtilizationInfo: ', error);
      throw error;
    }
  }

  private async _RemovePromotionUtilizationInfo(
    params: {
      promotionIds: string[];
      classroomId: Types.ObjectId;
      studentId: Types.ObjectId;
    },
    deletedBy: string,
    session: ClientSession,
  ) {
    try {
      await this.promotionUtilizationRepo.model
        .delete(
          {
            studentId: params.studentId,
            classroomId: params.classroomId,
            promotionId: { $in: params.promotionIds },
          },
          deletedBy,
        )
        .session(session)
        .lean()
        .exec();
    } catch (error) {
      this.logger.error('Error in _RemovePromotionUtilizationInfo: ', error);
      throw error;
    }
  }

  private async _CreatePaymentHistory(
    tuitionId: Types.ObjectId,
    body: ITuitionPaymentBody & { createdBy: string; updatedBy: string },
    session: ClientSession,
  ) {
    try {
      await this.tuitionPaymentHistoryRepo.create(
        {
          tuitionId,
          value: body.value,
          createdBy: body.createdBy,
          updatedBy: body.updatedBy,
          paymentMethodId: sto(body.paymentMethodId),
          paymentDate: body.paymentDate,
        },
        { session },
      );
    } catch (error) {
      this.logger.error('Error in _CreatePaymentHistory: ', error);
      throw error;
    }
  }
}
