import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { IContext, IFilterBase } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema, deleteManySchema } from '@/common/validations';
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
import { SyllabusService } from '../services/syllabus.service';
import {
  ISyllabusCreateFormData,
  ISyllabusFilter,
  ISyllabusUpdateFormData,
} from '../syllabus.interfaces';
import {
  CreateSyllabusSchema,
  SyllabusEditHistoryFilterSchema,
  UpdateSyllabusSchema,
  lectureFilterSchema,
  syllabusFilterSchema,
} from '../syllabus.validators';
import { SyllabusCheckUtil } from '../utils/syllabus-check.util';
import { sto } from '@/common/helpers/common.functions.helper';

@Controller('syllabus')
export class SyllabusController {
  constructor(
    private readonly service: SyllabusService,
    private readonly checkUtils: SyllabusCheckUtil,
  ) {}
  protected get i18n() {
    return I18nContext.current();
  }
  @RolesGuard(['syllabus.create'])
  @Post()
  async create(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(CreateSyllabusSchema))
    body: ISyllabusCreateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkDuplicatedSyllabusByName =
        await this.checkUtils.duplicateSyllabusByName(body.name);
      if (!checkDuplicatedSyllabusByName.valid)
        return checkDuplicatedSyllabusByName.error;

      const result = await this.service.create(body, context.user.id);

      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.view', 'syllabus.viewPersonal'])
  @Get()
  async findAll(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(syllabusFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: ISyllabusFilter,
    @EasyContext() context?: IContext,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllWithPaging(
        query,
        {
          id: context.user.id,
          roleType: context.roleType,
        },
      );
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.view', 'syllabus.viewPersonal'])
  @Get('/:id')
  async detail(@Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string) {
    try {
      const checkSyllabusExist = await this.checkUtils.syllabusExistById(id);
      if (!checkSyllabusExist.valid) return checkSyllabusExist.error;

      const result = await this.service.getDetail(id);
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.view', 'syllabus.viewPersonal'])
  @Get('/:id/lecture')
  async getLecturesOfSyllabus(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(lectureFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IFilterBase,
  ) {
    try {
      const checkSyllabusExist = await this.checkUtils.syllabusExistById(id);
      if (!checkSyllabusExist.valid) return checkSyllabusExist.error;

      const { items, totalItems } =
        await this.service.getAllLecturesBySyllabusId(id, query);
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.view', 'syllabus.viewPersonal'])
  @Get('/:id/syllabus-history-edit')
  async syllabusEditHistories(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(SyllabusEditHistoryFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: IFilterBase,
  ) {
    try {
      const checkSyllabusExist = await this.checkUtils.syllabusExistById(id);
      if (!checkSyllabusExist.valid) return checkSyllabusExist.error;

      const { items, totalItems } = await this.service.findHistoryEditSyllabus(
        id,
        query,
      );
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.update'])
  @Patch('/:id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(UpdateSyllabusSchema))
    body: ISyllabusUpdateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkSyllabusExist = await this.checkUtils.syllabusExistById(id);
      if (!checkSyllabusExist.valid) return checkSyllabusExist.error;

      if (body?.name) {
        const checkSyllabusDuplicateByName =
          await this.checkUtils.duplicateSyllabusByName(body.name);
        if (!checkSyllabusDuplicateByName.valid)
          return checkSyllabusDuplicateByName.error;
      }

      const result = await this.service.update(id, body, sto(context?.user.id));
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.delete'])
  @Delete('/:id')
  async deleteOne(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkSyllabusExist = await this.checkUtils.syllabusExistById(id);
      if (!checkSyllabusExist.valid) return checkSyllabusExist.error;

      const result = await this.service.deleteManyIds([id], context?.user.id);
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['syllabus.delete'])
  @Delete()
  async deleteMany(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(deleteManySchema))
    ids: string[],
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkManySyllabusExist = await this.checkUtils.syllabusExistByIds(
        ids,
      );
      if (!checkManySyllabusExist.valid) return checkManySyllabusExist.error;
      const result = await this.service.deleteManyIds(ids, context.user.id);
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
