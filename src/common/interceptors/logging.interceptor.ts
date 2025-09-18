import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip;

    const now = Date.now();
    
    this.logger.log(
      `${method} ${url} - User: ${user?.id || 'Anonymous'} - IP: ${ip} - UA: ${userAgent}`,
    );

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const contentLength = response.get('content-length');

        this.logger.log(
          `${method} ${url} ${statusCode} ${contentLength} - ${Date.now() - now}ms`,
        );
      }),
      catchError((error) => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;

        this.logger.error(
          `${method} ${url} ${statusCode} - ${Date.now() - now}ms - Error: ${error.message}`,
          error.stack,
        );

        return throwError(() => error);
      }),
    );
  }
}
