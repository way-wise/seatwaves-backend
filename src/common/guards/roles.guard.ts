import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CacheService } from '../services/cache.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { id?: string; userId?: string } | undefined;
    const userId = user?.userId || user?.id;
    if (!userId) {
      return false;
    }

    // Get user roles with caching
    const roles = await this.cache.getOrSet<string[]>(
      `user:roles:${userId}`,
      async () => {
        const userWithRoles = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            roles: {
              select: { role: { select: { name: true } } },
            },
          },
        });
        if (!userWithRoles) return [];
        return userWithRoles.roles.map((ur) => ur.role.name);
      },
      60, // TTL seconds
    );

    const userRoles = roles;
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
