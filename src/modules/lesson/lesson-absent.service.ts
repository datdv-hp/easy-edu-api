import { sto } from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import { AbsentRequestStatus } from '@/database/constants';
import { LessonAbsentRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    const session = await this.repo.model.startSession();
    try {
      session.startTransaction();
      const result = await this.repo
        .findByIdAndUpdate(
          id,
          { status: body.status },
          { new: true, runValidators: true },
        )
        .populate('userId', { email: 1 })
        .populate('lessonId', { name: 1, startTime: 1, endTime: 1, date: 1 })
        .select({ status: 1, reason: 1, userId: 1, lessonId: 1 })
        .lean();
      const user = result.userId as unknown as { email: string };
      const lesson = result.lessonId as unknown as {
        name: string;
        startTime: string;
        endTime: string;
        date: string;
      };
      await this.mailService.sendNotifyHandleAbsentRequest(user.email, {
        lessonName: lesson.name,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        isApproved: result.status === AbsentRequestStatus.APPROVED,
      });
      await session.commitTransaction();

      return { _id: id, status: body.status };
    } catch (error) {
      await session.abortTransaction();

      this.logger.error('Error in update service', error);
      throw error;
    } finally {
      await session.endSession();
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
