import { BaseService } from '@/common/services/base.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ICreateRegistrationBody,
  IRegistrationFilter,
} from './registration.interfaces';
import { RegistrationRepository } from '@/database/repositories';
import { OrderDirection } from '@/common/constants';
import { FilterQuery } from 'mongoose';
import { Registration } from '@/database/mongo-schemas';

@Injectable()
export class RegistrationService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly registrationRepo: RegistrationRepository,
  ) {
    super(RegistrationService.name, configService);
  }

  async createRegistration(body: ICreateRegistrationBody) {
    try {
      await this.registrationRepo.create(body);
      return body;
    } catch (error) {
      this.logger.error('Error in createRegistration: ', error);
      throw error;
    }
  }

  async findAllWithPaging(query: IRegistrationFilter) {
    try {
      const { keyword, limit, skip, orderBy } = query;
      const filter: FilterQuery<Registration> = {};
      if (keyword) {
        filter.$or = [
          { name: { $regex: `.*${keyword}.*`, $options: 'i' } },
          { email: { $regex: `.*${keyword}.*`, $options: 'i' } },
          { phone: { $regex: `.*${keyword}.*`, $options: 'i' } },
        ];
      }
      if (query.statuses?.length) {
        filter.status = { $in: query.statuses };
      }
      const orderDirection =
        query.orderDirection === OrderDirection.ASC ? 1 : -1;
      const [result] = await this.registrationRepo.model.aggregate([
        { $match: filter },
        { $project: { name: 1, email: 1, phone: 1, status: 1, createdAt: 1 } },
        {
          $facet: {
            data: [
              { $sort: { [orderBy]: orderDirection } },
              { $skip: skip },
              { $limit: limit },
            ],
            count: [{ $count: 'total' }],
          },
        },
      ]);
      const items = result.data || [];
      const totalItems = result.count[0]?.total || 0;
      return { items, totalItems };
    } catch (error) {
      this.logger.error('Error in findAllWithPaging: ', error);
      throw error;
    }
  }
}
