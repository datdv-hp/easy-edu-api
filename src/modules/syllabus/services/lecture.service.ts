import { sto } from '@/common/helpers/common.functions.helper';
import { BaseService } from '@/common/services/base.service';
import {
  LectureRepository,
  SyllabusHistoryRepository,
  SyllabusRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientSession } from 'mongoose';
import {
  ILectureCreateFormData,
  ILectureUpdateFormData,
} from '../syllabus.interfaces';
import { Types } from 'mongoose';

@Injectable()
export class LectureService extends BaseService {
  constructor(
    private readonly repo: LectureRepository,
    private readonly configService: ConfigService,
    private readonly syllabusHistoryRepo: SyllabusHistoryRepository,
    private readonly syllabusRepo: SyllabusRepository,
  ) {
    super(LectureService.name, configService);
  }

  private get model() {
    return this.repo.model;
  }

  async create(params: ILectureCreateFormData, createdBy: string) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const newLectures = params.lectures.map((lecture) => ({
        syllabusId: params.syllabusId,
        ...lecture,
      }));

      await this.repo.createMany(newLectures, { session });

      // add history edit syllabus
      await this._CreateSyllabusEditHistory(
        {
          syllabusId: sto(params.syllabusId),
          note: params.note,
          createdBy: createdBy,
        },
        session,
      );
      await session.commitTransaction();
      return params.lectures;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateMany(
    syllabusId: string,
    params: ILectureUpdateFormData,
    updatedBy: string,
  ) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();

      const query = params.lectures.map((lecture) => {
        const updateData = {
          updatedBy,
          name: lecture.name,
          referenceLinks: lecture.referenceLinks,
          file: lecture.files,
        };
        return {
          updateOne: {
            filter: { _id: lecture.lectureId },
            update: { $set: updateData },
          },
        };
      });

      await this.model.bulkWrite(query, { session });

      // add history edit syllabus
      await this._CreateSyllabusEditHistory(
        {
          syllabusId: sto(syllabusId),
          note: params.note,
          createdBy: updatedBy,
        },
        session,
      );

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in updateLecture service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteByIds(
    ids: string[],
    updateInfo: { syllabusId: Types.ObjectId; note: string },
    deletedBy: string,
  ): Promise<boolean> {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      await this.repo.delete({ _id: { $in: ids } }, deletedBy).session(session);

      // add history edit syllabus
      await this._CreateSyllabusEditHistory(
        {
          syllabusId: updateInfo.syllabusId,
          note: updateInfo.note,
          createdBy: deletedBy,
        },
        session,
      );

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error in deleteLectureByIds service', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async _CreateSyllabusEditHistory(
    params: {
      syllabusId: Types.ObjectId;
      note: string;
      createdBy: string;
    },
    session: ClientSession,
  ) {
    // add history edit syllabus
    await this.syllabusHistoryRepo.create(
      {
        syllabusId: params.syllabusId,
        note: params.note,
        createdBy: sto(params.createdBy),
      },
      { session },
    );
    // update updatedAt and updatedBy syllabus
    await this.syllabusRepo
      .findByIdAndUpdate(params.syllabusId, { updatedBy: params.createdBy })
      .session(session)
      .lean()
      .exec();
  }
}
