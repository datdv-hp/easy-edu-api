import { Role, RoleSchema } from '@/database/mongo-schemas/role.schema';
import { RoleRepository } from '@/database/repositories';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleCheckUtils } from './utils/role-check.utils';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      { name: Role.name, useFactory: async () => RoleSchema },
    ]),
    forwardRef(() => UserModule),
  ],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository, RoleCheckUtils],
  exports: [RoleRepository],
})
export class RoleModule {}
