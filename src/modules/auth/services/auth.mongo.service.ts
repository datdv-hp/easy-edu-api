import { createWinstonLogger } from '@/common/services/winston.service';
import { UserTokenRepository } from '@/database/repositories';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICreateUserTokenBody } from '../auth.interface';

@Injectable()
export class AuthMongoService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userTokenRepo: UserTokenRepository,
  ) {}

  private readonly logger = createWinstonLogger(
    AuthMongoService.name,
    this.configService,
  );

  async checkExistedHashToken(token: string) {
    try {
      const userToken = await this.userTokenRepo
        .existByField({
          hashToken: token,
        })
        .lean()
        .exec();
      return userToken;
    } catch (error) {
      this.logger.error(`Error in checkExistedHashToken service`, error);
      throw error;
    }
  }

  async revokeTokenByHashToken(hashToken: string) {
    try {
      const { deletedCount } = await this.userTokenRepo.model
        .deleteOne({
          hashToken,
        })
        .lean()
        .exec();
      return deletedCount;
    } catch (error) {
      this.logger.error(`Error in revokeTokenByHashToken service`, error);
      throw error;
    }
  }

  async createUserToken(params: ICreateUserTokenBody) {
    try {
      const newUserToken = await this.userTokenRepo.create(params);
      return newUserToken;
    } catch (error) {
      this.logger.error(`Error in createUserToken service`, error);
      throw error;
    }
  }
}
