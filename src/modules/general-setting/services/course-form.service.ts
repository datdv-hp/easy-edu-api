import { OrderDirection } from '@/common/constants';
import { stos } from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { GeneralSetting } from '@/database/mongo-schemas';
import { GeneralSettingRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { get } from 'lodash';
import { ClientSession, FilterQuery, PipelineStage, Types } from 'mongoose';
import {
  ICourseFormCreateFormData,
  ICourseFormUpdateFormData,
  IFilterCourseForm,
} from '../interfaces/course-form.interfaces';
import { SettingType } from '@/database/constants';

@Injectable()
export class CourseFormService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private repo: GeneralSettingRepository,
  ) {
    super(CourseFormService.name, configService);
  }

  private get model() {
    return this.repo.model;
  }

  async create(body: ICourseFormCreateFormData) {
    try {
      await this.repo.create({
        value: body.name,
        type: SettingType.COURSE_FORM,
      });

      return true;
    } catch (error) {
      this.logger.error('Error in create: ', error);
      throw error;
    }
  }

  async findAllWithPaging(params: IFilterCourseForm) {
    try {
      const filter: FilterQuery<GeneralSetting> = {
        $and: [{ type: SettingType.COURSE_FORM }],
      };
      if (params.keyword) {
        filter.$and.push({
          value: { $regex: `.*${params?.keyword}.*`, $options: 'i' },
        });
      }

      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const query: PipelineStage[] = [
        { $match: filter },
        { $project: { name: '$value', createdAt: 1 } },
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
      const data = await this.model.aggregate(query).exec();
      const items = get(data, '[0].data', []);
      const totalItems = get(data, '0.total.0.count', 0);

      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging: ', error);
      throw error;
    }
  }

  async findById(id: string) {
    try {
      const courseForm = await this.repo
        .findById(id, { name: '$value' })
        .lean()
        .exec();
      return courseForm;
    } catch (error) {
      this.logger.error('Error in findById: ', error);
      throw error;
    }
  }

  async update(
    id: string,
    body: ICourseFormUpdateFormData,
    updatedBy: Types.ObjectId,
  ) {
    try {
      const updateBody = {
        value: body.name,
        updatedBy,
      };
      const updatedCourseForm = await this.repo
        .findByIdAndUpdate(id, updateBody, { lean: true })
        .exec();

      return { _id: updatedCourseForm._id };
    } catch (error) {
      this.logger.error('Error in update: ', error);
      throw error;
    }
  }

  async bulkDelete(ids: string[], deletedBy: Types.ObjectId) {
    const session = await this.model.startSession();
    try {
      const courseFormIds = stos(ids);
      session.startTransaction();
      await this.repo
        .delete(
          { _id: { $in: courseFormIds }, type: SettingType.COURSE_FORM },
          deletedBy,
        )
        .session(session);
      await this._deleteCourseFormIdsInCourse(
        courseFormIds,
        deletedBy,
        session,
      );
      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in bulkDelete: ', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async _deleteCourseFormIdsInCourse(
    ids: Types.ObjectId[],
    updatedBy: Types.ObjectId,
    session: ClientSession,
  ) {
    try {
      return await this.model.updateMany(
        { courseFormIds: { $in: ids } },
        {
          $pull: { courseFormIds: ids },
          updatedBy,
        },
        { session },
      );
    } catch (error) {
      this.logger.error('Error in _deleteCourseFormIdsInCourse: ', error);
      throw error;
    }
  }
}
