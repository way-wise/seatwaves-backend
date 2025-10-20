import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, params, query, ip } = request;
    const correlationId = request.correlationId || 'N/A';
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Log request details (mask sensitive data)
    const maskedBody = this.maskSensitiveData(body);

    this.logger.log({
      message: 'Incoming request',
      correlationId,
      method,
      url,
      ip,
      userAgent,
      body: maskedBody,
      params,
      query,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;

          this.logger.log({
            message: 'Request completed',
            correlationId,
            method,
            url,
            statusCode,
            responseTime: `${responseTime}ms`,
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;

          this.logger.error({
            message: 'Request failed',
            correlationId,
            method,
            url,
            error: error.message,
            stack:
              process.env.NODE_ENV === 'development' ? error.stack : undefined,
            responseTime: `${responseTime}ms`,
          });
        },
      }),
    );
  }

  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apikey',
      'accesstoken',
      'refreshtoken',
      'creditcard',
      'cvv',
      'ssn',
    ];

    const masked = { ...data };
    for (const key of Object.keys(masked)) {
      if (
        sensitiveFields.some((field) => key.toLowerCase().includes(field))
      ) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }
}
