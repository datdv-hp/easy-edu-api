import {
  PaymentMethodSetting,
  PaymentMethodSettingSchema,
} from '@/database/mongo-schemas';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentMethodSettingRepository } from 'src/database/repositories';
import { UserModule } from '../user/user.module';
import { PaymentMethodSettingController } from './payment-method-setting.controller';
import { PaymentMethodSettingService } from './payment-method-setting.service';
import { PaymentMethodSettingCheckUtils } from './utils/payment-method-setting-check.utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: PaymentMethodSetting.name,
        useFactory: async () => PaymentMethodSettingSchema,
      },
    ]),
    UserModule,
  ],
  controllers: [PaymentMethodSettingController],
  providers: [
    PaymentMethodSettingRepository,
    PaymentMethodSettingService,
    PaymentMethodSettingCheckUtils,
  ],
  exports: [PaymentMethodSettingRepository],
})
export class PaymentMethodSettingModule {}
