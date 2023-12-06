import { HttpStatus } from '@/common/constants';
import { ErrorResponse } from '@/common/helpers/response.helper';
import { SettingType } from '@/database/constants';
import { GeneralSetting } from '@/database/mongo-schemas';
import {
  CourseRepository,
  GeneralSettingRepository,
} from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { difference } from 'lodash';
import { FilterQuery, ProjectionType } from 'mongoose';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class CourseFormCheckUtils {
  constructor(
    private readonly repo: GeneralSettingRepository,
    private readonly courseRepo: CourseRepository,
  ) {}

  private get i18n() {
    return I18nContext.current();
  }

  async duplicatedName(name: string, id?: string) {
    const filter: FilterQuery<GeneralSetting> = {
      value: name,
      type: SettingType.COURSE_FORM,
    };
    if (id) {
      filter._id = { $ne: id };
    }
    const existedCourseForm = await this.repo
      .existedByFields(filter)
      .lean()
      .exec();
    if (existedCourseForm) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: 'name',
            errorCode: HttpStatus.ITEM_ALREADY_EXIST,
            message: this.i18n.translate(
              `course-form-setting.create.name.exist`,
            ),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true };
  }

  async existedById(
    id: string,
    select: ProjectionType<GeneralSetting> = { _id: 1 },
  ) {
    const existedCourseForm = await this.repo
      .findOne({ _id: id, type: SettingType.COURSE_FORM }, select)
      .lean()
      .exec();
    if (!existedCourseForm) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate(`course-form-setting.getDetail.notExist`),
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedCourseForm };
  }

  async allExistedByIds(
    ids: string[],
    select: ProjectionType<GeneralSetting> = { _id: 1 },
  ) {
    const existedCourseForm = await this.repo
      .find({ _id: { $in: ids }, type: SettingType.COURSE_FORM }, select)
      .lean()
      .exec();
    const existedIds = existedCourseForm.map((item) => item._id.toString());
    if (existedCourseForm.length !== ids.length) {
      const error = new ErrorResponse(
        HttpStatus.BAD_REQUEST,
        this.i18n.translate('errors.400'),
        [
          {
            key: 'ids',
            errorCode: HttpStatus.ITEM_NOT_FOUND,
            message: this.i18n.translate(
              `course-form-setting.getDetail.notExist`,
            ),
            data: difference(ids, existedIds),
          },
        ],
      );
      return { valid: false, error };
    }
    return { valid: true, data: existedCourseForm };
  }
}
