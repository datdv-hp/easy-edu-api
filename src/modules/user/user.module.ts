import { User, UserSchema } from '@/database/mongo-schemas';
import { UserRepository } from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassroomModule } from '../classroom/classroom.module';
import { CourseModule } from '../course/course.module';
import { LessonModule } from '../lesson/lesson.module';
import { MailModule } from '../mail/mail.module';
import { RoleModule } from '../role/role.module';
import { SubjectModule } from '../subject/subject.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { UserVerifyModule } from '../user-verify/user-verify.module';
import { ManagerController } from './controllers/manager.controller';
import { StudentController } from './controllers/student.controller';
import { TeacherController } from './controllers/teacher.controller';
import { UserController } from './controllers/user.controller';
import { ManagerService } from './services/manager.service';
import { StudentService } from './services/student.service';
import { TeacherService } from './services/teacher.service';
import { UserService } from './services/user.service';
import { UserCheckUtils } from './utils/user-check.utils';
import { RegistrationModule } from '../registration/registration.module';
import { TuitionModule } from '../tuition/tuition.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: User.name, useFactory: async () => UserSchema },
    ]),
    forwardRef(() => RoleModule),
    MailModule,
    UserVerifyModule,
    UserCourseModule,
    forwardRef(() => CourseModule),
    forwardRef(() => SubjectModule),
    forwardRef(() => ClassroomModule),
    forwardRef(() => LessonModule),
    forwardRef(() => RegistrationModule),
    forwardRef(() => TuitionModule),
  ],
  controllers: [
    UserController,
    ManagerController,
    StudentController,
    TeacherController,
  ],
  providers: [
    UserService,
    UserRepository,
    ManagerService,
    StudentService,
    TeacherService,
    UserCheckUtils,
  ],
  exports: [UserRepository, UserCheckUtils],
})
export class UserModule {}
