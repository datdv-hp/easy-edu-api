import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { sto } from '@/common/helpers/common.functions.helper';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { IContext } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema } from '@/common/validations';
import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import {
  ICourseFormCreateFormData,
  ICourseFormUpdateFormData,
  IFilterCourseForm,
} from '../interfaces/course-form.interfaces';
import { CourseFormService } from '../services/course-form.service';
import { CourseFormCheckUtils } from '../utils/course-form-check.utils';
import {
  CourseFormFilterSchema,
  bulkDeleteCourseFormSettingsSchema,
  createCourseFormSchema,
  updateCourseFormSchema,
} from '../validators/course-form.validator';

@Controller('course-form-setting')
export class CourseFormController {
  constructor(
    private readonly service: CourseFormService,
    private readonly checkUtils: CourseFormCheckUtils,
  ) {}

  private get i18n() {
    return I18nContext.current();
  }

  @RolesGuard(['courseFormSetting.create'])
  @Post()
  async createCourseFormSetting(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createCourseFormSchema))
    body: ICourseFormCreateFormData,
  ) {
    try {
      const checkDuplicatedName = await this.checkUtils.duplicatedName(
        body.name,
      );
      if (!checkDuplicatedName.valid) return checkDuplicatedName.error;

      const newCourseForm = await this.service.create(body);
      return new SuccessResponse(newCourseForm);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['courseFormSetting.view'])
  @Get()
  async getList(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(CourseFormFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IFilterCourseForm,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllWithPaging(query);

      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['courseFormSetting.view'])
  @Get('/:id')
  async getCourseFormSettingDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const courseForm = await this.checkUtils.existedById(id, {
        name: '$value',
      });
      if (!courseForm.valid) return courseForm.error;

      return new SuccessResponse(courseForm.data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['courseFormSetting.update'])
  @Patch('/:id')
  async updateCourseFormSetting(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(updateCourseFormSchema))
    body: ICourseFormUpdateFormData,
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedCourseForm = await this.checkUtils.existedById(id);
      if (!checkExistedCourseForm.valid) return checkExistedCourseForm.error;

      const checkDuplicatedName = await this.checkUtils.duplicatedName(
        body.name,
        id,
      );
      if (!checkDuplicatedName.valid) return checkDuplicatedName.error;

      const result = await this.service.update(id, body, sto(context?.user.id));
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['courseFormSetting.delete'])
  @Delete('bulk-delete')
  async deleteManyCourseForms(
    @Body(
      new TrimBodyPipe(),
      new JoiValidationPipe(bulkDeleteCourseFormSettingsSchema),
    )
    body: { ids: string[] },
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedCourseForms = await this.checkUtils.allExistedByIds(
        body.ids,
      );
      if (!checkExistedCourseForms.valid) return checkExistedCourseForms.error;
      const result = await this.service.bulkDelete(
        body.ids,
        sto(context.user.id),
      );

      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
