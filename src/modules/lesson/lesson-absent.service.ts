import { MongoCollection } from '@/common/constants';
import { sto } from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { AbsentRequestStatus, DELETE_COND } from '@/database/constants';
import { LessonAbsentRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PipelineStage } from 'mongoose';
import { MailService } from '../mail/mail.service';
import {
  IHandleLessonAbsentForm,
  ILessonAbsentCreateForm,
} from './lesson.interfaces';

@Injectable()
export class LessonAbsentService extends BaseService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly repo: LessonAbsentRepository,
    private readonly mailService: MailService,
  ) {
    super(LessonAbsentService.name, configService);
  }

  async create(
    userId: string,
    dto: ILessonAbsentCreateForm & { updatedBy: string; createdBy: string },
  ) {
    try {
      return await this.repo.create({
        userId: sto(userId),
        lessonId: sto(dto.lessonId),
        reason: dto.reason,
      });
    } catch (error) {
      throw error;
    }
  }

  async update(
    id: string,
    body: IHandleLessonAbsentForm & { updatedBy: string },
  ) {
    try {
      const query: PipelineStage[] = [
        { $match: { _id: sto(id) } },
        { $limit: 1 },
        { $set: { status: body.status } },
        {
          $lookup: {
            from: MongoCollection.USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { email: 1 } },
            ],
          },
        },
        {
          $lookup: {
            from: MongoCollection.LESSONS,
            localField: 'lessonId',
            foreignField: '_id',
            as: 'lesson',
            pipeline: [
              { $match: DELETE_COND },
              { $limit: 1 },
              { $project: { name: 1, startTime: 1, endTime: 1, date: 1 } },
            ],
          },
        },
        { $unwind: '$user' },
        { $unwind: '$lesson' },
        { $project: { status: 1, reason: 1, user: 1, lesson: 1 } },
      ];
      const [request] = await this.repo.model.aggregate(query).exec();
      await this.mailService.sendNotifyHandleAbsentRequest(request.user.email, {
        lessonName: request.lesson.name,
        date: request.lesson.date,
        startTime: request.lesson.startTime,
        endTime: request.lesson.endTime,
        isApproved: request.status === AbsentRequestStatus.APPROVED,
      });
      return request;
    } catch (error) {
      this.logger.error('Error in update service', error);
      throw error;
    }
  }

  async delete(id: string, deletedBy: string) {
    try {
      return await this.repo.model.deleteById(id, deletedBy).lean().exec();
    } catch (error) {
      this.logger.error('Error in delete service', error);
      throw error;
    }
  }
}
