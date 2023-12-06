import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_EXPIRY_TIME, S3_CLIENT } from './upload.constants';
import { IFileInfo } from './upload.interfaces';

@Injectable()
export class UploadService {
  constructor(@Inject(S3_CLIENT) protected client: S3Client) {}

  async prepareUpload(dto: IFileInfo, bucket: string) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: `${dto.prefix}${dto.name}`,
      ContentType: dto.contentType,
    });
    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: DEFAULT_EXPIRY_TIME,
      signableHeaders: dto.contentType ? new Set(['content-type']) : undefined,
    });

    return { signedUrl };
  }

  async list(dto: IFileInfo, bucket: string) {
    const res = await this.client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Delimiter: '/',
        Prefix: dto.prefix,
      }),
    );

    return [
      ...(res.Contents || []).map((f) => ({
        key: f.Key,
        lastModified: f.LastModified,
        eTag: f.ETag,
        size: f.Size,
      })),
      ...(res.CommonPrefixes || []).map((f) => ({
        key: f.Prefix,
        size: 0,
      })),
    ];
  }

  async download(dto: IFileInfo, bucket: string) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: `${dto.prefix}${dto.name}`,
    });
    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: DEFAULT_EXPIRY_TIME,
    });

    return { signedUrl };
  }

  async deleteFiles(urls: string[], bucket: string) {
    try {
      const keys = urls.map((url) => new URL(url).pathname.slice(1));
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      });
      const res = await this.client.send(command);
      return res?.Deleted;
    } catch (error) {
      throw error;
    }
  }
}
