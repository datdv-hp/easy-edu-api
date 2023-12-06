import { UserVerify, UserVerifySchema } from '@/database/mongo-schemas';
import { UserVerifyRepository } from '@/database/repositories';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: UserVerify.name, useFactory: async () => UserVerifySchema },
    ]),
  ],
  controllers: [],
  providers: [UserVerifyRepository],
  exports: [UserVerifyRepository],
})
export class UserVerifyModule {}
