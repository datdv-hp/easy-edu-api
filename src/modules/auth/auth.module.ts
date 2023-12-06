import { UserToken, UserTokenSchema } from '@/database/mongo-schemas';
import { UserTokenRepository } from '@/database/repositories';
import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { AuthMongoService } from './services/auth.mongo.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: UserToken.name, useFactory: async () => UserTokenSchema },
    ]),
    UserModule,
    JwtModule.register({
      global: true,
      verifyOptions: {
        ignoreExpiration: false,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthMongoService, JwtService, UserTokenRepository],
  exports: [],
})
export class AuthModule {}
