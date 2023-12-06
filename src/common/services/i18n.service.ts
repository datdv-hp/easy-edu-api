import { Global, Module } from '@nestjs/common';
import {
  AcceptLanguageResolver,
  I18nModule as NestI18nModule,
} from 'nestjs-i18n';
import * as path from 'path';
import { Language } from '../constants';

@Global()
@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: Language.EN,
      fallbacks: { 'en-*': Language.EN, 'vi-*': Language.VI },
      loaderOptions: {
        path: path.join('dist/i18n'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
      viewEngine: 'hbs',
    }),
  ],
  controllers: [],
  providers: [],
})
export class I18nModule {}
