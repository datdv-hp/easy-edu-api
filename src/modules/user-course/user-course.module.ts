import { UserCourse, UserCourseSchema } from '@/database/mongo-schemas';
import { UserCourseRepository } from '@/database/repositories';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: UserCourse.name, useFactory: async () => UserCourseSchema },
    ]),
  ],
  controllers: [],
  providers: [UserCourseRepository],
  exports: [UserCourseRepository],
})
export class UserCourseModule {}
