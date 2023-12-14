import { EasyContext } from '@/common/decorators/easy-context.decorator';
import { RolesGuard } from '@/common/guards/authorization.guard';
import { sto } from '@/common/helpers/common.functions.helper';
import { SuccessResponse } from '@/common/helpers/response.helper';
import { IContext, IUserCredential } from '@/common/interfaces';
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
import {
  ICourseCreateFormData,
  ICourseFilter,
  ICourseUpdateFormData,
} from './course.interfaces';
import { CourseService } from './course.service';
import {
  courseFilterSchema,
  createCourseSchema,
  updateCourseSchema,
} from './course.validators';
import { CourseCheckUtils } from './utils/course-check.utils';

@Controller('course')
export class CourseController {
  constructor(
    private readonly service: CourseService,
    private readonly checkUtils: CourseCheckUtils,
  ) {}

  @RolesGuard(['course.create'])
  @Post()
  async create(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(createCourseSchema))
    body: ICourseCreateFormData,
    @EasyContext('user') userCtx?: IUserCredential,
  ) {
    try {
      if (body?.subjectIds?.length) {
        const checkExistedSubjects = await this.checkUtils.allExistedSubjects(
          body.subjectIds,
        );
        if (!checkExistedSubjects.valid) return checkExistedSubjects.error;
      }

      if (body?.courseFormIds?.length) {
        const checkExistedCourseForms =
          await this.checkUtils.allExistedCourseForms(body.courseFormIds);
        if (!checkExistedCourseForms.valid)
          return checkExistedCourseForms.error;
      }

      const newCourse = await this.service.create({
        ...body,
        createdBy: sto(userCtx.id),
      });

      return new SuccessResponse(newCourse);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.detailBasic'])
  @Get(':id/detail')
  async courseInfo(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkExistedCourse = await this.checkUtils.existedById(id);
      if (!checkExistedCourse.valid) return checkExistedCourse.error;

      const result = await this.service.getCourseDetail(id);
      return new SuccessResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.detailBasic'])
  @Get(':id')
  async courseDetail(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkExistedCourse = await this.checkUtils.existedById(id, {
        name: 1,
        courseFormIds: 1,
        times: 1,
        subjectIds: 1,
        description: 1,
        tuition: 1,
      });
      if (!checkExistedCourse.valid) return checkExistedCourse.error;

      return new SuccessResponse(checkExistedCourse.data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.view', 'course.viewPersonal'])
  @Get()
  async findAll(
    @Query(
      new RemoveEmptyQueryPipe(),
      new JoiValidationPipe(courseFilterSchema),
      new ModifyFilterQueryPipe(),
    )
    dto: ICourseFilter,
    @EasyContext() ctx?: IContext,
  ) {
    try {
      const { items, totalItems } = await this.service.findAllWithPaging(
        dto,
        ctx.roleType,
        sto(ctx.user?.id),
      );
      return new SuccessResponse({ items, totalItems });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.update'])
  @Patch(':id')
  async update(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @Body(new TrimBodyPipe(), new JoiValidationPipe(updateCourseSchema))
    body: ICourseUpdateFormData,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedCourse = await this.checkUtils.existedById(id, [
        'subjectIds',
      ]);
      if (!checkExistedCourse.valid) return checkExistedCourse.error;

      if (body?.subjectIds) {
        const checkExistedSubjects = await this.checkUtils.allExistedSubjects(
          body.subjectIds,
        );
        if (!checkExistedSubjects.valid) return checkExistedSubjects.error;
      }

      if (body.courseFormIds) {
        const checkExistedCourseForms =
          await this.checkUtils.allExistedCourseForms(body.courseFormIds);
        if (!checkExistedCourseForms.valid)
          return checkExistedCourseForms.error;
      }

      const newCourse = await this.service.update(
        id,
        { ...body, updatedBy: sto(context.user.id) },
        checkExistedCourse.data.subjectIds,
      );
      return new SuccessResponse(newCourse);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.delete'])
  @Delete(':id')
  async delete(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedCourse = await this.checkUtils.existedById(id);
      if (!checkExistedCourse.valid) return checkExistedCourse.error;

      const checkNotExistedStudentInCourse =
        await this.checkUtils.notExistedStudentInCourses([id]);
      if (!checkNotExistedStudentInCourse.valid)
        return checkNotExistedStudentInCourse.error;

      const checkNotExistedClassOfCourse =
        await this.checkUtils.notExistedClassOfCourses([id]);
      if (!checkNotExistedClassOfCourse.valid)
        return checkNotExistedClassOfCourse.error;

      const success = await this.service.deleteById(id, sto(context.user.id));

      return new SuccessResponse({ success });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.delete'])
  @Delete()
  async deleteManyIds(
    @Body(new TrimBodyPipe(), new JoiValidationPipe(deleteManySchema))
    ids: string[],
    @EasyContext() context?: IContext,
  ) {
    try {
      const checkExistedCourses = await this.checkUtils.allExistedByIds(ids);
      if (!checkExistedCourses.valid) return checkExistedCourses.error;

      const checkNotExistedStudentInCourses =
        await this.checkUtils.notExistedStudentInCourses(ids);
      if (!checkNotExistedStudentInCourses.valid)
        return checkNotExistedStudentInCourses.error;

      const checkNotExistedClassOfCourses =
        await this.checkUtils.notExistedClassOfCourses(ids);
      if (!checkNotExistedClassOfCourses.valid)
        return checkNotExistedClassOfCourses.error;

      await this.service.deleteManyByIds(ids, sto(context.user.id));

      return new SuccessResponse({ ids });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @RolesGuard(['course.viewTeacherByCourse'])
  @Get(':id/teacher')
  async teachersInCourse(
    @Param('id', new JoiValidationPipe(ObjectIdSchema)) id: string,
  ) {
    try {
      const checkCourseExist = await this.checkUtils.existedById(id);
      if (!checkCourseExist.valid) return checkCourseExist.error;

      const data = await this.service.findTeacherByCourseId(id);

      return new SuccessResponse(data);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
