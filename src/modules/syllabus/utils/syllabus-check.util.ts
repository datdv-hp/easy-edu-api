import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { BaseService } from '@/common/services/base.service';
import { Syllabus } from '@/database/mongo-schemas';
import { SyllabusRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectionType } from 'mongoose';

@Injectable()
export class SyllabusCheckUtil extends BaseService {
  constructor(
    private readonly repo: SyllabusRepository,
    protected readonly configService: ConfigService,
  ) {
    super(SyllabusCheckUtil.name, configService);
  }

  async duplicateSyllabusByName(
    name: string,
    select: ProjectionType<Syllabus> = { _id: 1 },
  ) {
    try {
      const existedSyllabus = await this.repo
        .findOne({ name }, select)
        .lean()
        .exec();

      if (existedSyllabus) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('syllabus.exist'),
          [
            {
              key: 'name',
              errorCode: HttpStatus.ITEM_ALREADY_EXIST,
              message: this.i18n.translate('syllabus.exist'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existedSyllabus };
    } catch (error) {
      this.logger.error('Error in duplicateSyllabusByName checkUtil', error);
      throw error;
    }
  }

  async syllabusExistById(
    id: string,
    errorKey = 'id',
    select: ProjectionType<Syllabus> = { _id: 1 },
  ) {
    try {
      const existSyllabus = await this.repo.findById(id, select).lean().exec();
      if (!existSyllabus) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('syllabus.notFound'),
          [
            {
              key: errorKey,
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('syllabus.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existSyllabus };
    } catch (error) {
      this.logger.error('Error in syllabusExistById checkUtil', error);
      throw error;
    }
  }

  async syllabusExistByIds(
    ids: string[],
    select: ProjectionType<Syllabus> = { _id: 1 },
  ) {
    try {
      const existSyllabus = await this.repo
        .findByIds(ids, select)
        .lean()
        .exec();
      if (existSyllabus.length !== ids.length) {
        const error = new ErrorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.translate('syllabus.notFound'),
          [
            {
              key: 'ids',
              errorCode: HttpStatus.ITEM_NOT_FOUND,
              message: this.i18n.translate('syllabus.notFound'),
            },
          ],
        );
        return { valid: false, error };
      }
      return { valid: true, data: existSyllabus };
    } catch (error) {
      this.logger.error('Error in syllabusExistById checkUtil', error);
      throw error;
    }
  }
}
