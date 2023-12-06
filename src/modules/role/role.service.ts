import { OrderDirection } from '@/common/constants';
import { BaseService } from '@/common/services/base.service';
import { Role } from '@/database/mongo-schemas';
import { RoleRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { get } from 'lodash';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import {
  IRoleCreateFormData,
  IRoleFilter,
  IRoleUpdateFormData,
} from './role.interface';
@Injectable()
export class RoleService extends BaseService {
  constructor(
    private readonly repo: RoleRepository,
    private readonly configService: ConfigService,
  ) {
    super(RoleService.name, configService);
  }
  private get model() {
    return this.repo.model;
  }
  async create(
    params: IRoleCreateFormData & {
      createdBy: Types.ObjectId;
      updatedBy: Types.ObjectId;
    },
  ) {
    try {
      const role = await this.repo.create({
        ...params,
        features: JSON.stringify(params.features),
      });
      return role;
    } catch (error) {
      this.logger.error('Error in create service', error);
      throw error;
    }
  }

  async update(
    id: string,
    params: IRoleUpdateFormData & {
      updateBy: Types.ObjectId;
    },
  ) {
    try {
      const role = await this.model.findByIdAndUpdate(
        id,
        { ...params, features: JSON.stringify(params.features) },
        { new: true, runValidators: true },
      );
      return role;
    } catch (error) {
      this.logger.error('Error in update service', error);
      throw error;
    }
  }

  async findAllWithPaging(params: IRoleFilter) {
    try {
      const { orderBy, limit, skip } = params;
      const orderDirection =
        params.orderDirection === OrderDirection.ASC ? 1 : -1;
      const filter: FilterQuery<Role> = {
        $and: [
          {
            $or: [
              { isMaster: { $exists: false } },
              { isMaster: { $eq: null || false } },
            ],
          },
        ],
      };
      if (params?.keyword) {
        filter.$and.push({
          name: { $regex: `.*${params.keyword}.*`, $options: 'i' },
        });
      }

      const query: PipelineStage[] = [
        { $match: filter },
        {
          $project: {
            name: 1,
            features: 1,
            description: 1,
            createdAt: 1,
            type: 1,
            isDefault: 1,
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

      const data = await this.model.aggregate(query).exec();
      const items = get(data, '[0].data', []).map((item) => ({
        ...item,
        features: JSON.parse(item.features),
      }));
      const totalItems = get(data, '[0].total.[0].count', 0);
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging service', error);
      throw error;
    }
  }

  async deleteById(id: string, deletedBy: Types.ObjectId): Promise<boolean> {
    try {
      await this.model.deleteById(id, deletedBy).lean().exec();
      return true;
    } catch (error) {
      throw error;
    }
  }
}
