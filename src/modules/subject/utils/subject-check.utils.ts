import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { SubjectDocument } from '@/database/mongo-schemas';
import { SubjectRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { FilterQuery, ProjectionType, Types } from 'mongoose';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class SubjectCheckUtils {
  constructor(private readonly repo: SubjectRepository) {}

  private get model() {
    return this.repo.model;
  }

  private get i18n() {
    return I18nContext.current();
  }

  async duplicatedBySubjectCode(
    subjectCode: string,
    id?: string | Types.ObjectId,
  ) {
    const filter: FilterQuery<SubjectDocument> = { subjectCode };
    if (id) filter['_id'] = { $ne: id };
    const existedSubject = await this.model.exists(filter).lean().exec();
    if (existedSubject) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: 'subjectCode',
            errorCode: HttpStatus.ITEM_ALREADY_EXIST,
            message: this.i18n.translate('subject.subjectCodeExist'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true };
  }

  async existedById(
    id: string | Types.ObjectId,
    select: ProjectionType<SubjectDocument> = ['_id'],
  ) {
    const existedSubject = await this.model.findById(id, select).lean().exec();
    if (!existedSubject) {
      const error = new ErrorResponse(
        HttpStatus.ITEM_NOT_FOUND,
        this.i18n.translate('errors.400'),
        [
          {
            key: 'id',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('subject.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedSubject };
  }

  async allExistedByIds(
    ids: (string | Types.ObjectId)[],
    select: ProjectionType<SubjectDocument> = ['_id'],
  ) {
    const existedSubjects = await this.model
      .find({ _id: { $in: ids } }, select)
      .lean()
      .exec();
    if (existedSubjects.length !== ids.length) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: 'id',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate('subject.notFound'),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedSubjects };
  }
}
