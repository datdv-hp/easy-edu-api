import { RegistrationRepository } from '@/database/repositories';
import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Registration, RegistrationSchema } from '@/database/mongo-schemas';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Registration.name, useFactory: () => RegistrationSchema },
    ]),
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService, RegistrationRepository],
  exports: [RegistrationRepository],
})
export class RegistrationModule {}
