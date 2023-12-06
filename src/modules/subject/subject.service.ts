import { generateNextCode } from '@/common/helpers/common.functions.helper';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { CodePrefix } from '@/database/constants';
import { Subject } from '@/database/mongo-schemas';
import {
  ClassroomRepository,
  LessonRepository,
  SubjectRepository,
  UserRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery, ProjectionType, Types } from 'mongoose';
import {
  ISubjectCreateFormData,
  ISubjectFilter,
  ISubjectUpdateFormData,
} from './subject.interfaces';

@Injectable()
export class SubjectService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly classroomRepo: ClassroomRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly userRepo: UserRepository,
    private readonly repo: SubjectRepository,
  ) {
    super(SubjectService.name, configService);
  }

  private get model() {
    return this.repo.model;
  }

  async create(params: ISubjectCreateFormData) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const latestSubjectOfYear = await this.repo.findLatestSubjectOfYear();
      const maxCode = latestSubjectOfYear?.code;
      const code = generateNextCode(CodePrefix.SUBJECT, maxCode);
      const newSubject = { ...params, code };
      const createdSubject = await new this.model(newSubject).save({ session });

      await session.commitTransaction();
      return createdSubject;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in create service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllWithPaging(
    params: ISubjectFilter,
    select?: ProjectionType<Subject>,
  ) {
    try {
      const filter: FilterQuery<Subject> = { $and: [] };
      if (params.keyword) {
        filter.$or = [
          { name: { $regex: `.*${params?.keyword}.*`, $options: 'i' } },
          { code: { $regex: `.*${params?.keyword}.*`, $options: 'i' } },
          { subjectCode: { $regex: `.*${params?.keyword}.*`, $options: 'i' } },
        ];
      }
      if (!filter.$and?.length) delete filter.$and;

      const { orderBy, orderDirection, skip, limit } = params;
      const sort = { [orderBy]: orderDirection };

      const [items, totalItems] = await Promise.all([
        this.model
          .find(filter, select)
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
  s;
  async update(
    id: string,
    params: ISubjectUpdateFormData & { updatedBy: Types.ObjectId },
  ): Promise<Subject> {
    try {
      return await this.model
        .findByIdAndUpdate(id, params, { new: true, runValidators: true })
        .lean()
        .exec();
    } catch (error) {
      this.logger.error('Error in update service', error);
      throw error;
    }
  }

  async deleteManyIds(
    ids: string[],
    teacherIdsHaveSubject: Types.ObjectId[],
    deletedBy: Types.ObjectId,
  ) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      await this.model
        .delete({ _id: { $in: ids } }, deletedBy)
        .session(session)
        .lean()
        .exec();

      if (teacherIdsHaveSubject.length) {
        await this.userRepo.model.updateMany(
          { _id: { $in: teacherIdsHaveSubject } },
          { $pullAll: { 'teacherDetail.subjectIds': ids } },
          { session, lean: true },
        );
      }

      await this.lessonRepo.model.updateMany(
        { subjectId: { $in: ids } },
        { $set: { subjectId: null } },
        { session, lean: true },
      );
      await session.commitTransaction();
      return new SuccessResponse(ids);
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in deleteManyIds service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async existBySubjectCode(subjectCode: string) {
    try {
      return await this.repo.existedByFields({ subjectCode }).lean().exec();
    } catch (error) {
      this.logger.error('Error in existBySubjectCode service', error);
      throw error;
    }
  }

  async existById(id: string) {
    try {
      return await this.repo.existedById(id).lean().exec();
    } catch (error) {
      this.logger.error('Error in existById service', error);
      throw error;
    }
  }

  async findById(id: string) {
    try {
      const subject = await this.model
        .findById(id, ['name', 'code', 'subjectCode', 'documents'])
        .lean()
        .exec();
      return subject;
    } catch (error) {
      this.logger.error('Error in findById service', error);
      throw error;
    }
  }
}
