import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CorrelationIdInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get or generate correlation ID
    const correlationId =
      request.headers['x-request-id'] ||
      request.headers['x-correlation-id'] ||
      uuidv4();

    // Attach to request and response
    request.correlationId = correlationId;
    response.setHeader('X-Request-ID', correlationId);

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    this.logger.log(
      `[${correlationId}] ${method} ${url} - User-Agent: ${userAgent} - IP: ${ip}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;
          this.logger.log(
            `[${correlationId}] ${method} ${url} ${statusCode} - ${responseTime}ms`,
          );
        },
        error: (error) => {
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `[${correlationId}] ${method} ${url} ${statusCode} - ${responseTime}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
