import {
  DateFormat,
  MongoCollection,
  OrderDirection,
  UserRole,
  UserType,
} from '@/common/constants';
import {
  generateNextCode,
  sto,
} from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { CodePrefix, DELETE_COND, UserVerifyType } from '@/database/constants';
import { Classroom, User } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  UserRepository,
  UserVerifyRepository,
} from '@/database/repositories';
import { addFieldStatusPipeline } from '@/modules/classroom/classroom.helpers';
import { MailService } from '@/modules/mail/mail.service';
import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { FilterQuery, PipelineStage, ProjectionType, Types } from 'mongoose';
import {
  ITeacherCreateFormData,
  ITeacherFilter,
  ITeacherFilterClassroom,
  ITeacherUpdateFormData,
} from '../user.interfaces';

@Injectable()
export class TeacherService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: UserRepository,
    private readonly userVerifyRepo: UserVerifyRepository,
    private readonly mailService: MailService,
    private readonly classroomRepo: ClassroomRepository,
  ) {
    super(TeacherService.name, configService);
  }
  private get model() {
    return this.repo.model;
  }

  async createTeacher(dto: ITeacherCreateFormData) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const latestTeacher = await this.repo
        .findLatestUserOfYear(UserType.TEACHER)
        .lean()
        .exec();
      const teacherCode = latestTeacher?.code;
      const code = generateNextCode(CodePrefix.TEACHER, teacherCode);
      const newUser = new this.model({
        ...dto,
        code,
        userRole: UserRole.USER,
        type: UserType.TEACHER,
      });
      const createdUser = await newUser.save({ session });
      const verifyData = new this.userVerifyRepo.model({
        userId: createdUser._id,
        code: randomUUID(),
        type: UserVerifyType.ACTIVE_ACCOUNT,
      });
      await verifyData.save({ session });
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
      this.logger.error('Error in createTeacher service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllWithPaging(params: ITeacherFilter) {
    try {
      const filter: FilterQuery<User> = { $and: [{ type: UserType.TEACHER }] };
      if (params.keyword) {
        filter.$and.push({
          $or: [
            { name: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { code: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { phone: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
            { email: { $regex: `.*${params.keyword}.*`, $options: 'i' } },
          ],
        });
      }

      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const query: PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.SUBJECTS,
            localField: 'teacherDetail.subjectIds',
            foreignField: '_id',
            as: 'subjects',
          },
        },
        {
          $project: {
            code: 1,
            name: 1,
            subjectNames: '$subjects.name',
            phone: 1,
            email: 1,
            type: 1,
            status: 1,
            createdAt: 1,
            userRole: 1,
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
      const [result] = await this.model.aggregate(query).exec();
      const items = result.data || [];
      const totalItems = result.total[0]?.count || 0;
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging service', error);
      throw error;
    }
  }

  async getDetail(id: string) {
    try {
      const query: PipelineStage[] = [
        { $match: { _id: sto(id), type: UserType.TEACHER } },
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
      ];
      const result = await this.model.aggregate(query).exec();
      return result?.[0];
    } catch (error) {
      this.logger.error('Error in getDetail service', error);
      throw error;
    }
  }

  async findByIds(
    ids: (Types.ObjectId | string)[],
    select?: ProjectionType<User>,
  ) {
    const teachers = await this.model
      .find({ _id: { $in: ids }, type: UserType.TEACHER }, select)
      .lean()
      .exec();
    return teachers;
  }

  async updateTeacher(
    id: Types.ObjectId | string,
    params: ITeacherUpdateFormData & { updatedBy: string },
  ) {
    try {
      const updatedTeacher = await this.model.findByIdAndUpdate(id, params, {
        new: true,
        runValidators: true,
        lean: true,
      });
      return updatedTeacher;
    } catch (error) {
      this.logger.error('Error in updateTeacher service', error);
      throw error;
    }
  }

  async deleteTeacherByIds(
    ids: (Types.ObjectId | string)[],
    deletedBy: Types.ObjectId | string,
  ): Promise<boolean> {
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
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async removeManyTeacherTag(
    ids: (Types.ObjectId | string)[],
    updatedBy?: Types.ObjectId | string,
  ) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const result = await this.model.updateMany(
        { _id: { $in: ids } },
        { $set: { teacherDetail: null, type: UserType.NONE, updatedBy } },
        { new: true, runValidators: true, lean: true },
      );
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in removeManyTeacherTag service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllTeachingClassesByTeacherId(
    teacherId: string,
    params: ITeacherFilterClassroom,
  ) {
    try {
      const filter: FilterQuery<Classroom> = { teacherIds: sto(teacherId) };
      const currentDate = dayjs()
        .endOf('day')
        .format(DateFormat.YYYY_MM_DD_HYPHEN);

      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const pipelines: PipelineStage[] = [
        addFieldStatusPipeline(currentDate),
        { $match: filter },
        {
          $lookup: {
            from: MongoCollection.COURSES,
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1 } },
            ],
          },
        },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: 1,
            code: 1,
            course: 1,
            status: 1,
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
      const [result] = await this.classroomRepo.model
        .aggregate(pipelines)
        .exec();
      const items = result.data || [];
      const totalItems = result.total?.[0]?.count || 0;
      return { items, totalItems };
    } catch (error) {
      this.logger.error(
        'Error in findAllTeachingClassesByTeacherId service',
        error,
      );
      throw error;
    }
  }
}
