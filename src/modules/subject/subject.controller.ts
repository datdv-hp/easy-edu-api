import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { sto } from '@/common/helpers/common.functions.helper';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { IUserCredential } from '@/common/interfaces';
import { JoiValidationPipe } from '@/common/pipes/joi.validation.pipe';
import { ModifyFilterQueryPipe } from '@/common/pipes/modifyListQuery.pipe';
import { RemoveEmptyQueryPipe } from '@/common/pipes/removeEmptyQuery.pipe';
import { TrimBodyPipe } from '@/common/pipes/trim.body.pipe';
import { ObjectIdSchema, deleteManySchema } from '@/common/validations';
import { Subject } from '@/database/mongo-schemas';
import { UserRepository } from '@/database/repositories';
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
import { FilterQuery } from 'mongoose';
import { I18nService } from 'nestjs-i18n';
import {
  ISubjectCreateFormData,
  ISubjectFilter,
  ISubjectUpdateFormData,
} from './subject.interfaces';
import { SubjectService } from './subject.service';
import {
  subjectCreateSchema,
  subjectFilterSchema,
  subjectUpdateSchema,
} from './subject.validators';
import { SubjectCheckUtils } from './utils/subject-check.utils';

@Controller('subject')
export class SubjectController {
  constructor(
    private readonly i18n: I18nService,
    private readonly service: SubjectService,
    private readonly userRepo: UserRepository,
    private readonly checkUtils: SubjectCheckUtils,
  ) {}

  @RolesGuard(['subject.create'])
  @Post()
  async create(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(subjectCreateSchema))
    body: ISubjectCreateFormData,
  ) {
    try {
      const checkDuplicatedSubject =
        await this.checkUtils.duplicatedBySubjectCode(body.subjectCode);
      if (!checkDuplicatedSubject.valid) return checkDuplicatedSubject.error;

      const subject = await this.service.create(body);
      return new SuccessResponse(subject);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['subject.view'])
  @Get()
  async find(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(subjectFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    query: ISubjectFilter,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllWithPaging(query);

      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['subject.view'])
  @Get(':id')
  async findDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const SELECT: FilterQuery<Subject> = {
        name: 1,
        code: 1,
        subjectCode: 1,
        description: 1,
        documents: 1,
      };
      const checkExistedSubject = await this.checkUtils.existedById(id, SELECT);
      if (!checkExistedSubject.valid) return checkExistedSubject.error;

      return new SuccessResponse(checkExistedSubject.data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['subject.update'])
  @Patch(':id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(subjectUpdateSchema))
    body: ISubjectUpdateFormData,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const checkExistedSubject = await this.checkUtils.existedById(id);
      if (!checkExistedSubject.valid) return checkExistedSubject.error;

      const checkDuplicatedSubject =
        await this.checkUtils.duplicatedBySubjectCode(body.subjectCode, id);
      if (!checkDuplicatedSubject.valid) return checkDuplicatedSubject.error;

      const subject = await this.service.update(id, {
        ...body,
        updatedBy: sto(userCtx.id),
      });
      return new SuccessResponse(subject);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['subject.delete'])
  @Delete(':id')
  async delete(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const checkExistedSubject = await this.checkUtils.existedById(id);
      if (!checkExistedSubject.valid) return checkExistedSubject.error;

      const teachersBySubjectId = await this.userRepo
        .allExistedByFields({ 'teacherDetail.subjectIds': id })
        .lean()
        .exec();

      const teacherIds = teachersBySubjectId.map((teacher) => teacher._id);

      const subject = await this.service.deleteManyIds(
        [id],
        teacherIds,
        sto(userCtx.id),
      );

      return new SuccessResponse(subject);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['subject.delete'])
  @Delete()
  async deleteManyIds(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(deleteManySchema))
    ids: string[],
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      const checkExistedSubjects = await this.checkUtils.allExistedByIds(ids);
      if (!checkExistedSubjects.valid) return checkExistedSubjects.error;

      const teacherHaveSubject = await this.userRepo
        .allExistedByIds(ids)
        .lean()
        .exec();

      const teacherIds = teacherHaveSubject.map((teacher) => teacher._id);

      const isSuccess = await this.service.deleteManyIds(
        ids,
        teacherIds,
        sto(userCtx.id),
      );

      return new SuccessResponse(isSuccess);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
