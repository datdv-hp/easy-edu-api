import envSchema from '@/common/config/validation-schema';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { HttpExceptionFilter } from './common/filters/exceptions.filter';
import { AuthenticationGuard } from './common/guards/authentication.guard';
import { AuthorizationGuard } from './common/guards/authorization.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HeaderMiddleware } from './common/middlewares/header.middleware';
import { I18nModule } from './common/services/i18n.service';
import { MongoModule } from './common/services/mongo.service';
import { RedisCacheModule } from './common/services/redis-cache.service';
import { WinstonModule } from './common/services/winston.service';
import { AuthModule } from './modules/auth/auth.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { CourseModule } from './modules/course/course.module';
import { CronJobModule } from './modules/cron-job/cron-job.module';
import { DropdownModule } from './modules/dropdown/dropdown.module';
import { EvaluationCriteriaModule } from './modules/evaluation-criteria-setting/evaluation-criteria.module';
import { ExternalSystemsModule } from './modules/external-systems/external-systems.module';
import { GeneralSettingModule } from './modules/general-setting/general-setting.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { MailModule } from './modules/mail/mail.module';
import { RoleModule } from './modules/role/role.module';
import { SubjectModule } from './modules/subject/subject.module';
import { SyllabusModule } from './modules/syllabus/syllabus.module';
import { TimekeepingModule } from './modules/timekeeping/timekeeping.module';
import { UploadModule } from './modules/upload/upload.module';
import { UserCourseModule } from './modules/user-course/user-course.module';
import { UserVerifyModule } from './modules/user-verify/user-verify.module';
import { UserModule } from './modules/user/user.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { PromotionSettingModule } from './modules/promotion-setting/promotion-setting.module';
@Module({
  imports: [
    EvaluationCriteriaModule,
    LessonModule,
    SyllabusModule,
    ClassroomModule,
    SubjectModule,
    UserCourseModule,
    CourseModule,
    ConfigModule.forRoot({
      validationSchema: envSchema,
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    RedisCacheModule,
    CronJobModule,
    MailModule,
    WinstonModule,
    I18nModule,
    MongoModule,
    AuthModule,
    UserModule,
    DropdownModule,
    UserVerifyModule,
    RoleModule,
    GeneralSettingModule,
    ExternalSystemsModule,
    UploadModule,
    TimekeepingModule,
    RegistrationModule,
    PromotionSettingModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HeaderMiddleware).forRoutes('*');
  }
}
