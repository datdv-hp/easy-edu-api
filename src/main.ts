import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import ConfigKey from './common/config/config-key';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());
  const configService = app.get(ConfigService);
  const whiteList = configService.get(ConfigKey.CORS_WHITELIST) || '*';
  const corsOptions: CorsOptions = {
    origin:
      whiteList?.split(',')?.length > 1 ? whiteList.split(',') : whiteList,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Language',
      'X-Timezone',
      'X-Timezone-Name',
    ],
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  };
  app.enableCors(corsOptions);
  // set prefix of routes
  app.setGlobalPrefix(configService.get(ConfigKey.BASE_PATH));
  // use winston for logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  // cookie-parser
  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('EasyEdu APIs')
    .setDescription('The EasyEdu APIs description')
    .setVersion('1.0')
    .addTag('easy-edu')
    .setBasePath('api/v1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const PORT = configService.get(ConfigKey.PORT);
  await app.listen(PORT, 'localhost', async () => {
    console.log(`Server is running on port ${await app.getUrl()}`);
  });
}
bootstrap();
