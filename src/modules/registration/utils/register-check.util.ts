import { BaseService } from '@/common/services/base.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RegisterCheckUtil extends BaseService {
  constructor(protected readonly configService: ConfigService) {
    super(RegisterCheckUtil.name, configService);
  }
}
