import {
  MongoCollection,
  UserRole,
  UserStatus,
  UserType,
} from '@/common/constants';
import {
  generateNextCode,
  sto,
} from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { CodePrefix, DELETE_COND, UserVerifyType } from '@/database/constants';
import { User } from '@/database/mongo-schemas';
import { UserRepository, UserVerifyRepository } from '@/database/repositories';
import { MailService } from '@/modules/mail/mail.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { isUndefined } from 'lodash';
import { FilterQuery, PipelineStage, ProjectionType } from 'mongoose';
import {
  IManagerCreateFormData,
  IManagerFilter,
  IManagerUpdateFormData,
} from '../user.interfaces';

@Injectable()
export class ManagerService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: UserRepository,
    private readonly mailService: MailService,
    private readonly userVerifyRepo: UserVerifyRepository,
  ) {
    super(ManagerService.name, configService);
  }
  private get model() {
    return this.repo.model;
  }

  async createManager(dto: IManagerCreateFormData) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const newUser = {
        ...dto,
        role: dto.roleId,
        userRole: UserRole.MANAGER,
        type: dto.isTeacher ? UserType.TEACHER : UserType.NONE,
        status: UserStatus.CONFIRMING,
      } as User | IManagerCreateFormData;
      if (dto.isTeacher) {
        const latestTeacher = await this.repo
          .findLatestUserOfYear(UserType.TEACHER)
          .lean()
          .exec();
        const teacherCode = latestTeacher?.code;
        const code = generateNextCode(CodePrefix.TEACHER, teacherCode);
        newUser['code'] = code;
      }
      const createdUser = await new this.model(newUser).save({ session });
      const verifyData = await this.userVerifyRepo.create(
        {
          userId: createdUser._id,
          code: randomUUID(),
          type: UserVerifyType.ACTIVE_ACCOUNT,
        },
        { session },
      );
      await this.mailService.sendVerifyEmail({
        email: dto.email,
        name: dto.name,
        code: verifyData.code,
      });
      this.logger.info(
        `Created user: ${createdUser._id} with email: ${createdUser.email}`,
      );
      await session.commitTransaction();
      return createdUser;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in createManager service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllWithPaging(params: IManagerFilter) {
    try {
      const filter: FilterQuery<User> = {
        $and: [{ userRole: UserRole.MANAGER }],
      };
      if (params.keyword) {
        filter.$and.push({
          $or: [
            { name: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { phone: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { email: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
          ],
        });
      }
      if (!isUndefined(params.isTeacher)) {
        filter.$and.push({
          type: params.isTeacher ? UserType.TEACHER : UserType.NONE,
        });
      }
      const { orderBy, orderDirection, skip, limit } = params;
      const sort = { [orderBy]: orderDirection };

      const SELECT = 'code name phone email type status createdAt verify';
      const [items, totalItems] = await Promise.all([
        this.model
          .find(filter, SELECT)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.model.countDocuments(filter),
      ]);
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging service', error);
      throw error;
    }
  }

  async findOneById(id: string) {
    try {
      return await this.model
        .findOne({ _id: id, userRole: UserRole.MANAGER })
        .lean();
    } catch (error) {
      this.logger.error('Error in findOneById service', error);
      throw error;
    }
  }
  async getManagerDetail(id: string) {
    try {
      const query: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        { $limit: 1 },
        {
          $lookup: {
            from: MongoCollection.ROLES,
            localField: 'roleId',
            foreignField: '_id',
            as: 'role',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: '$role' },
        {
          $lookup: {
            from: MongoCollection.SUBJECTS,
            localField: 'teacherDetail.subjectIds',
            foreignField: '_id',
            as: 'teacherDetail.subjects',
            pipeline: [{ $match: DELETE_COND }, { $project: { name: 1 } }],
          },
        },
        {
          $project: {
            name: 1,
            code: 1,
            avatar: 1,
            email: 1,
            dob: 1,
            phone: 1,
            gender: 1,
            teacherDetail: 1,
            role: 1,
            status: 1,
          },
        },
      ];
      const [result] = await this.model.aggregate(query).exec();
      return result;
    } catch (error) {
      this.logger.error('Error in findOneById service', error);
      throw error;
    }
  }

  async findByIds(ids: string[], select?: ProjectionType<User>) {
    const managers = await this.model
      .find({ _id: { $in: ids }, userRole: UserRole.MANAGER }, select)
      .lean()
      .exec();
    return managers;
  }

  async updateManager(
    id: string,
    dto: IManagerUpdateFormData & { updatedBy: string },
  ): Promise<User> {
    try {
      const isTeacher = !!dto?.isTeacher;
      if (isTeacher) {
        Object.assign(dto, { type: UserType.TEACHER });
      } else {
        Object.assign(dto, { teacherDetail: null, type: UserType.NONE });
      }
      const user = await this.model.findByIdAndUpdate(
        id,
        { ...dto },
        { new: true, runValidators: true },
      );
      return user;
    } catch (error) {
      this.logger.error('Error in updateManager service', error);
      throw error;
    }
  }

  async bulkUpdateManager(
    ids: string[],
    data: IManagerUpdateFormData & { updatedBy: string },
  ) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const type = data?.isTeacher ? UserType.TEACHER : UserType.NONE;
      const result = await this.model.updateMany(
        { _id: { $in: ids } },
        { $set: { ...data, type } },
        { new: true, runValidators: true, lean: true },
      );
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in bulkUpdateManager service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteManagerByIds(ids: string[], deletedBy: string): Promise<boolean> {
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
      this.logger.error('Error in deleteManagerByIds service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
