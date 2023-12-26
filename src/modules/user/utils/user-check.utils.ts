import { HttpStatus, UserRole, UserStatus, UserType } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import {
  Role,
  Tuition,
  TuitionPaymentHistory,
  User,
  UserVerifyDocument,
} from '@/database/mongo-schemas';
import {
  RoleRepository,
  TuitionRepository,
  UserRepository,
  UserVerifyRepository,
} from '@/database/repositories';
import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery, ProjectionType, Types } from 'mongoose';

@Injectable()
export class UserCheckUtils extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: UserRepository,
    private readonly userVerifyRepo: UserVerifyRepository,
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
    private readonly tuitionRepo: TuitionRepository,
  ) {
    super(UserCheckUtils.name, configService);
  }

  async userExistedByEmailOrPhone(
    params: { email?: string; phone?: string; id?: string },
    select: ProjectionType<User> = { _id: 1, email: 1, phone: 1 },
  ) {
    try {
      const filter = { $or: [] } as FilterQuery<User>;
      if (params.email) filter.$or.push({ email: params.email });
      if (params.phone) filter.$or.push({ phone: params.phone });
      if (!filter.$or.length) delete filter.$or;
      const userExisted = await this.userRepo
        .findOne(filter, select)
        .lean()
        .exec();
      if (params.id && userExisted._id.toString() === params.id) {
        return { valid: true, data: userExisted };
      }
      if (params.email && params.email === userExisted?.email) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('common.error.emailExist'),
          [
            {
              key: 'email',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate('common.error.emailExist'),
            },
          ],
        );
        return { valid: false, error };
      }
      if (params.phone && params.phone === userExisted?.phone) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('common.error.phoneExist'),
          [
            {
              key: 'phone',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate('common.error.phoneExist'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: userExisted };
    } catch (error) {
      this.logger.error(
        'Error in userExistedByEmailOrPhone checkUtil: ',
        error,
      );
    }
  }

  async userExistedById(
    params: { id: string; userRole?: UserRole; type?: UserType },
    select: ProjectionType<User> = { _id: 1 },
    errorKey = 'id',
  ) {
    const filter = { _id: params.id } as FilterQuery<User>;
    if (params.userRole) {
      filter.userRole = params.userRole;
    }
    if (params.type) {
      filter.type = params.type;
    }
    const existedUser = await this.repo.model
      .findOne(filter, select)
      .lean()
      .exec();
    if (!existedUser) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('user.not_found'),
        [
          {
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            key: errorKey,
            message: this.i18n.t('user.not_found'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedUser };
  }

  async usersExistByIds(
    params: { ids: string[]; userRole?: UserRole; type?: UserType },
    select: ProjectionType<User> = { _id: 1 },
    errorKey = 'ids',
  ) {
    try {
      const filter = { _id: { $in: params.ids } } as FilterQuery<User>;
      if (params.userRole) {
        filter.userRole = params.userRole;
      }
      if (params.type) {
        filter.type = params.type;
      }
      const users = await this.repo.find(filter, select).lean().exec();
      if (users.length !== params.ids.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('user.not_found'),
          [
            {
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              key: errorKey,
              message: this.i18n.t('user.not_found'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: users };
    } catch (error) {
      this.logger.error('Error in usersExistByIds checkUtil: ', error);
      throw error;
    }
  }

  async notActivatedUserByEmail(
    email: string,
    select: ProjectionType<User> = { _id: 1 },
  ) {
    const userExisted = await this.repo
      .findOne({ email }, select)
      .lean()
      .exec();
    if (!userExisted) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('user.not_found'),
        [
          {
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            key: 'email',
            message: this.i18n.t('user.not_found'),
          },
        ],
      );
      return { valid: false, error };
    }

    if (userExisted.status === UserStatus.ACTIVE) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('user.user.userIsActived'),
        [
          {
            key: 'status',
            message: this.i18n.t('user.user.userIsActived'),
            errorCode: HttpStatus.ITEM_INVALID,
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: userExisted };
  }

  async notActivatedUserById(
    id: string,
    select: ProjectionType<User> = { _id: 1 },
  ) {
    const userExisted = await this.repo.findById(id, select).lean().exec();
    if (!userExisted) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('user.not_found'),
        [
          {
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            key: 'email',
            message: this.i18n.t('user.not_found'),
          },
        ],
      );
      return { valid: false, error };
    }

    if (userExisted.status === UserStatus.ACTIVE) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('user.user.userIsActived'),
        [
          {
            key: 'status',
            message: this.i18n.t('user.user.userIsActived'),
            errorCode: HttpStatus.ITEM_INVALID,
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: userExisted };
  }

  async verifyCodeExisted(
    userId: string | Types.ObjectId,
    code: string,
    select: ProjectionType<UserVerifyDocument> = { _id: 1 },
  ) {
    const existedUserVerify = await this.userVerifyRepo
      .findOne({ userId, code }, select)
      .lean()
      .exec();
    if (!existedUserVerify) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('user.user.verifyCodeIsWrong'),
        [
          {
            key: 'codeInvalid',
            message: this.i18n.t('user.user.verifyCodeIsWrong'),
            errorCode: HttpStatus.ITEM_INVALID,
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedUserVerify };
  }

  async verifyCodeNotExpired(codeUpdatedAt: Date) {
    const isCodeExpired = dayjs(codeUpdatedAt)
      .add(Number(process.env.EXPIRED_ACTIVE_BUSINESS_HOURS), 'hours')
      .isBefore();
    if (isCodeExpired) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('user.user.verifyCodeIsExpired'),
        [
          {
            key: 'codeExpired',
            message: this.i18n.t('user.user.verifyCodeIsExpired'),
            errorCode: HttpStatus.ITEM_INVALID,
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true };
  }

  async roleExistedById(
    id: string,
    select: ProjectionType<Role> = { _id: 1 },
    errorKey = 'roleId',
  ) {
    try {
      const existedRole = await this.roleRepo
        .findById(id, select)
        .lean()
        .exec();

      if (!existedRole) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('common.error.roleNotFound'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('common.error.roleNotFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedRole };
    } catch (error) {
      this.logger.error('Error in roleExistedById checkUtil: ', error);
      throw error;
    }
  }

  async StudentsNotExistAnyPayment(
    userIds: string[],
    select: ProjectionType<Tuition> = { _id: 1, userId: 1 },
  ) {
    try {
      const tuitionsHadPayment = await this.tuitionRepo
        .find({ userId: { $in: userIds }, paidValue: { $gt: 0 } }, select)
        .lean()
        .exec();
      if (tuitionsHadPayment.length) {
        const userIdsHadPayment = tuitionsHadPayment.map(
          (tuition) => tuition.userId,
        );
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t(
            'user.student.cannotDeleteStudentHaveTuitionPaymentHistory',
          ),
          [
            {
              key: 'tuition',
              errorCode: HttpStatus.CONFLICT,
              message: this.i18n.t(
                'user.student.cannotDeleteStudentHaveTuitionPaymentHistory',
              ),
              data: userIdsHadPayment,
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true };
    } catch (error) {
      this.logger.error(
        'Error in StudentsNotExistAnyPayment checkUtil: ',
        error,
      );
      throw error;
    }
  }
}
