import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../helpers/response.helper';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    return next.handle().pipe(
      map((data: ApiResponse<unknown>) => {
        if (data?.code) {
          context.switchToHttp().getResponse().status(data.code);
        }
        return data;
      }),
    );
  }
}
