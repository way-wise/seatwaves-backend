import { Module, Global } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { DistributedLockService } from './services/distributed-lock.service';
import { AuditService } from './services/audit.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AllExceptionsFilter } from './exceptions/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { SecurityMiddleware } from './middleware/security.middleware';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    CacheService,
    DistributedLockService,
    AuditService,
    RolesGuard,
    PermissionsGuard,
    RateLimitGuard,
    AllExceptionsFilter,
    LoggingInterceptor,
    SecurityMiddleware,
  ],
  exports: [
    CacheService,
    DistributedLockService,
    AuditService,
    RolesGuard,
    PermissionsGuard,
    RateLimitGuard,
    AllExceptionsFilter,
    LoggingInterceptor,
    SecurityMiddleware,
  ],
})
export class CommonModule {}
