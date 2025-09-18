import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CacheService } from '../services/cache.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If route doesn't require specific permissions, allow
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { id?: string; userId?: string } | undefined;
    const userId = user?.userId || user?.id;
    if (!userId) return false;

    // Load permissions with caching
    const perms = await this.cache.getOrSet<string[]>(
      `user:perms:${userId}`,
      async () => {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            roles: {
              select: {
                role: {
                  select: {
                    rolePermissions: {
                      select: { permissions: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        });
        if (!dbUser) return [];
        const set = new Set<string>();
        for (const ur of dbUser.roles) {
          for (const rp of ur.role.rolePermissions) set.add(rp.permissions.name);
        }
        return Array.from(set);
      },
      60, // TTL seconds
    );

    const userPermissions = new Set<string>(perms);

    // Strict mode: require ALL listed permissions
    return requiredPermissions.every((p) => userPermissions.has(p));
  }
}
