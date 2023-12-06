import ConfigKey from '@/common/config/config-key';
import { MongoCollection, UserStatus } from '@/common/constants';
import {
  hashPassword,
  randomPassword,
  sto,
} from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { DELETE_COND, UserVerifyType } from '@/database/constants';
import { User } from '@/database/mongo-schemas';
import { UserRepository, UserVerifyRepository } from '@/database/repositories';
import { MailService } from '@/modules/mail/mail.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import { compactUserFeatures } from '../user.helpers';
import { IUpdateProfileFormData } from '../user.interfaces';
import { randomUUID } from 'crypto';
@Injectable()
export class UserService extends BaseService {
  constructor(
    private readonly configService: ConfigService,
    private readonly repo: UserRepository,
    private readonly userVerifyRepo: UserVerifyRepository,
    private readonly mailService: MailService,
  ) {
    super(UserService.name, configService);
  }
  private get model() {
    return this.repo.model;
  }

  async checkExistedUserById(id: Types.ObjectId) {
    try {
      const existedUser = await this.repo.existedById(id);
      return existedUser;
    } catch (error) {
      this.logger.error('Error in checkExistedUserById service', error);
      throw error;
    }
  }

  async getMyProfile(id: string) {
    try {
      const query: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        {
          $lookup: {
            from: MongoCollection.ROLES,
            localField: 'roleId',
            foreignField: '_id',
            as: 'role',
            pipeline: [
              { $match: DELETE_COND },
              { $project: { name: 1, features: 1 } },
            ],
          },
        },
        { $unwind: '$role' },
        { $addFields: { features: '$role.features' } },
        {
          $project: {
            password: 0,
            roleId: 0,
            role: 0,
          },
        },
      ];
      const result = await this.model.aggregate(query).exec();
      // TODO: return course info if user is STUDENT
      const user = result[0];
      const features = JSON.parse(user?.features);
      Object.assign(user, {
        features: compactUserFeatures(features),
      });

      return user;
    } catch (error) {
      this.logger.error('Error in getMyProfile service', error);
      throw error;
    }
  }

  async updateTemporaryPassword(id: string, password: string) {
    try {
      const user = await this.model
        .findByIdAndDelete(id, {
          password: hashPassword(password),
          isTemporary: false,
        })
        .select('_id')
        .lean()
        .exec();
      return user;
    } catch (error) {
      this.logger.error(`Error in updateTemporaryPassword service`, error);
      throw error;
    }
  }
  async changePassword(id: string, password: string) {
    try {
      const user = await this.model
        .findByIdAndUpdate(id, {
          password: hashPassword(password),
        })
        .select('_id')
        .lean()
        .exec();
      return user;
    } catch (error) {
      this.logger.error('Error in changePassword service', error);
      throw error;
    }
  }

  async updateProfile(id: string, data: IUpdateProfileFormData) {
    try {
      const user = await this.model
        .findByIdAndUpdate(id, data)
        .select('_id')
        .lean()
        .exec();
      return user;
    } catch (error) {
      this.logger.error('Error in updateProfile service', error);
      throw error;
    }
  }

  async existedUsersByFields(data: { phone?: string; email?: string }) {
    try {
      const query: FilterQuery<User> = { $or: [] };
      if (data.phone) {
        query.$or.push({
          phone: data.phone,
        });
      }

      if (data.email) {
        query.$or.push({
          email: data.email,
        });
      }

      return await this.model.find(query, ['email', 'phone']).lean().exec();
    } catch (error) {
      this.logger.error('Error in existedUserByFields service', error);
      throw error;
    }
  }
  async checkExistedUserByPhoneOrEmail(data: {
    phone?: string;
    email?: string;
  }) {
    try {
      const query: FilterQuery<User> = { $or: [] };
      if (data.phone) {
        query.$or.push({ phone: data.phone });
      }
      if (data.email) {
        query.$or.push({ email: data.email });
      }
      return await this.model.exists(query).lean().exec();
    } catch (error) {
      this.logger.error('Error in existedUserByFields service', error);
      throw error;
    }
  }

  async active(
    user: { id: string | Types.ObjectId; name: string; email: string },
    userVerifyId: Types.ObjectId,
  ) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      await this.userVerifyRepo.model
        .deleteOne({ _id: userVerifyId })
        .session(session);
      const password = randomPassword();
      await this.repo
        .findByIdAndUpdate(user.id, {
          status: UserStatus.ACTIVE,
          password: hashPassword(password),
          isTemporary: true,
        })
        .session(session);
      const feDomain = this.configService.get(ConfigKey.FRONTEND_DOMAIN);
      const loginUrl = `${feDomain}/login`;
      await this.mailService.sendActivatedEmailSuccess(user.email, {
        name: user.name,
        loginUrl: loginUrl,
        email: user.email,
        password,
      });

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in active service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
  async resendVerifyEmail(user: User, createdBy: string) {
    try {
      let userVerify = await this.userVerifyRepo.findOne({
        userId: user._id,
        type: UserVerifyType.ACTIVE_ACCOUNT,
      });
      const newCode = randomUUID();

      if (userVerify) {
        userVerify.code = newCode;
        await userVerify.save();
      } else {
        userVerify = await this.userVerifyRepo.create({
          userId: user._id,
          code: newCode,
          type: UserVerifyType.ACTIVE_ACCOUNT,
          createdBy: sto(createdBy),
        });
      }
      await this.mailService.sendVerifyEmail({
        email: user.email,
        name: user.name,
        code: newCode,
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
}
