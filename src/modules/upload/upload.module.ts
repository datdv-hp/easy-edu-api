import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ConfigKey from 'src/common/config/config-key';
import { S3_CLIENT } from './upload.constants';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: S3_CLIENT,
      useFactory: (config: ConfigService) => {
        const region = config.get(ConfigKey.AWS_S3_BUCKET_REGION);
        const accessKeyId = config.get(ConfigKey.AWS_ACCESS_KEY_ID);
        const secretAccessKey = config.get(ConfigKey.AWS_SECRET_ACCESS_KEY);

        return new S3Client({
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class UploadModule {}
