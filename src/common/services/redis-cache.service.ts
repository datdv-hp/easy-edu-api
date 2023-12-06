import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigService } from '@nestjs/config';
import ConfigKey from '../config/config-key';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get(ConfigKey.REDIS_HOST),
            port: config.get(ConfigKey.REDIS_PORT),
            connectTimeout: 30000,
            tls: config.get(ConfigKey.REDIS_TLS),
          },
          ttl: config.get(ConfigKey.REDIS_CACHE_TTL),
          password: config.get(ConfigKey.REDIS_PASSWORD),
          pingInterval: config.get(ConfigKey.REDIS_PING_INTERVAL),
        }),
      }),
    }),
  ],
})
export class RedisCacheModule {}
