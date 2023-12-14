import dayjs from '@/plugins/dayjs';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { CodePrefix } from '../constants';
import { Tuition, TuitionDocument } from '../mongo-schemas';
import { BaseRepository } from './base.repository';
import { ProjectionType, Types } from 'mongoose';
import { ClientSession } from 'mongoose';
import {
  generateNextCode,
  sto,
} from '@/common/helpers/common.functions.helper';
import { FilterQuery } from 'mongoose';
@Injectable()
export class TuitionRepository extends BaseRepository<TuitionDocument> {
  constructor(
    @InjectModel(Tuition.name)
    model: SoftDeleteModel<TuitionDocument>,
  ) {
    super(model);
  }

  findLatestTuitionOfYear(year = dayjs().year()) {
    return this.model
      .findOneWithDeleted({
        code: { $regex: `${CodePrefix.TUITION}${year}*`, $options: 'i' },
      })
      .sort({ _id: -1 });
  }

  checkAnyPaidTuitionByStudentIdsAndClassroomIds(
    params: {
      studentIds?: (string | Types.ObjectId)[];
      classroomIds?: (string | Types.ObjectId)[];
    },
    select: ProjectionType<Tuition> = { _id: 1 },
  ) {
    const filter: FilterQuery<Tuition> = { paidValue: { $gt: 0 } };
    if (params.studentIds) {
      filter.userId = { $in: params.studentIds };
    }
    if (params.classroomIds) {
      filter.classroomId = { $in: params.classroomIds };
    }
    return this.model.findOne(filter, select);
  }

  async CreateTuitionForStudents(
    params: {
      classroomId: Types.ObjectId | string;
      courseId: string | Types.ObjectId;
      studentIds: string[];
      createdBy: Types.ObjectId;
      tuition: number;
      paymentStartDate: Date;
      paymentEndDate: Date;
      updatedBy: Types.ObjectId;
      presenterIdsMapByStudentId: Record<string, string | undefined>;
    },
    session: ClientSession,
  ) {
    const lastTuitionCode = await this.findLatestTuitionOfYear().lean().exec();
    const tuitionCode = lastTuitionCode?.code;
    const prefix = `${CodePrefix.LESSON}${dayjs().year()}`;
    const maxCode = tuitionCode ? +tuitionCode.substring(prefix.length) : 0;
    const items = params.studentIds.map((studentId, index) => {
      const presenterId = params.presenterIdsMapByStudentId[studentId];
      return {
        classroomId: params.classroomId,
        userId: sto(studentId),
        code: generateNextCode(CodePrefix.TUITION, maxCode + index),
        courseId: params.courseId,
        originalValue: params.tuition,
        payValue: params.tuition,
        shortageValue: params.tuition,
        paymentStartDate: dayjs(params.paymentStartDate)
          .startOf('day')
          .toDate(),
        paymentEndDate: dayjs(params.paymentEndDate).endOf('day').toDate(),
        createdBy: params.createdBy,
        updatedBy: params.updatedBy,
        presenterId: presenterId !== undefined ? sto(presenterId) : undefined,
      };
    });
    await this.model.create(items, { session });
  }

  async RemoveTuitionForStudents(
    params: {
      classroomId: string;
      studentIds: string[];
      deletedBy: Types.ObjectId;
    },
    session: ClientSession,
  ) {
    await this.model
      .delete(
        {
          classroomId: params.classroomId,
          userId: { $in: params.studentIds },
          paidValue: 0,
        },
        params.deletedBy,
      )
      .session(session);
  }
}
