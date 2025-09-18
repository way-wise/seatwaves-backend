import { Injectable, NotAcceptableException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRolePermissionsDto } from './dto/create.role.dto';
import { CacheService } from 'src/common/services/cache.service';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // Get All Roles
  async getAllRoles() {
    return this.prisma.role.findMany();
  }

  // Get All Permissions
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany();

    const groupedPermissions = permissions.reduce((acc: any, perm: any) => {
      if (!acc[perm.group]) acc[perm.group] = [];
      if (!acc[perm.group].some((p: any) => p.id === perm.id)) {
        acc[perm.group].push({
          id: perm.id,
          name: perm.name,
          group: perm.group,
          createdAt: perm.createdAt,
          updatedAt: perm.updatedAt,
        });
      }
      return acc;
    }, {});

    return groupedPermissions;
  }

  // Get Role and it's permissions
  async getRolePermissions(roleId: string) {
    const rolePermissions = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!rolePermissions) {
      throw new NotAcceptableException('Role not found');
    }

    // Flatten permissions
    const allPermissions = rolePermissions.rolePermissions.flatMap(
      ({ permissions }) => permissions,
    );

    // Group + dedupe
    const groupedPermissions = allPermissions.reduce((acc: any, perm: any) => {
      if (!acc[perm.group]) acc[perm.group] = [];
      if (!acc[perm.group].some((p: any) => p.id === perm.id)) {
        acc[perm.group].push({
          id: perm.id,
          name: perm.name,
          group: perm.group,
          createdAt: perm.createdAt,
          updatedAt: perm.updatedAt,
        });
      }
      return acc;
    }, {});

    return {
      id: rolePermissions.id,
      role: rolePermissions.name,
      createdAt: rolePermissions.createdAt,
      updatedAt: rolePermissions.updatedAt,
      permissions: groupedPermissions,
    };
  }

  // Create Role & Assign Permissions
  async createRolePermissions(body: CreateRolePermissionsDto) {
    // Check role already exists
    const exists = await this.prisma.role.findUnique({
      where: { name: body.name.toUpperCase() },
    });

    if (exists) {
      throw new NotAcceptableException('Role already exists');
    }

    // check if any permission is invalid
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: body.permissions } },
    });

    if (permissions.length !== body.permissions.length) {
      throw new NotAcceptableException('One or more permissions are invalid');
    }

    const createdRolePermissions = await this.prisma.role.create({
      data: {
        name: body.name.toUpperCase(),
        rolePermissions: {
          create: body.permissions.map((permissionId) => ({
            permissionId,
          })),
        },
      },
    });

    // Invalidate permission caches globally (conservative)
    await this.cache.invalidatePattern('user:perms:*');

    return createdRolePermissions;
  }

  // Update Role Permissions
  async updateRolePermissions(roleId: string, body: CreateRolePermissionsDto) {
    // Check role already exists
    const roleExists = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!roleExists) {
      throw new NotAcceptableException('Role not found');
    }

    // check if any permission is invalid
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: body.permissions } },
    });

    if (permissions.length !== body.permissions.length) {
      throw new NotAcceptableException('One or more permissions are invalid');
    }

    const updatedRolePermissions = await this.prisma.role.update({
      where: { id: roleExists.id },
      data: {
        rolePermissions: {
          deleteMany: {},
          create: body.permissions.map((permissionId) => ({
            permissionId,
          })),
        },
      },
    });

    // Invalidate permission caches globally (conservative)
    await this.cache.invalidatePattern('user:perms:*');

    return updatedRolePermissions;
  }

  // Delete Role
  async deleteRole(roleId: string) {
    const roleExists = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!roleExists) {
      throw new NotAcceptableException('Role not found');
    }

    await this.prisma.role.delete({
      where: { id: roleExists.id },
    });

    // Invalidate caches related to roles and permissions
    await Promise.all([
      this.cache.invalidatePattern('user:roles:*'),
      this.cache.invalidatePattern('user:perms:*'),
    ]);

    return {
      message: 'Role deleted successfully',
    };
  }

  // Assign a role to a user
  async assignRoleToUser(userId: string, roleId: string) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new NotAcceptableException('User not found');
    if (!role) throw new NotAcceptableException('Role not found');

    await this.prisma.userRoles.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });

    // Invalidate this user's role/permission caches
    await Promise.all([
      this.cache.del(`user:roles:${userId}`),
      this.cache.del(`user:perms:${userId}`),
    ]);

    return { message: 'Role assigned to user' };
  }

  // Remove a role from a user
  async removeRoleFromUser(userId: string, roleId: string) {
    const existing = await this.prisma.userRoles.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });

    if (!existing) throw new NotAcceptableException('Role not assigned');

    await this.prisma.userRoles.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    // Invalidate this user's role/permission caches
    await Promise.all([
      this.cache.del(`user:roles:${userId}`),
      this.cache.del(`user:perms:${userId}`),
    ]);

    return { message: 'Role removed from user' };
  }

  // Get roles for a user
  async getUserRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotAcceptableException('User not found');
    return user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name }));
  }

  // Get permissions for a user (flattened unique list)
  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permissions: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotAcceptableException('User not found');
    const set = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.rolePermissions) set.add(rp.permissions.name);
    }
    return Array.from(set);
  }

  // Check if user has required roles
  async hasRoles(userId: string, roles: string[], mode: 'any' | 'all' = 'any') {
    const userRoles = await this.getUserRoles(userId);
    const names = new Set(userRoles.map((r) => r.name));
    return mode === 'all'
      ? roles.every((r) => names.has(r))
      : roles.some((r) => names.has(r));
  }

  // Check if user has required permissions
  async hasPermissions(
    userId: string,
    permissions: string[],
    mode: 'any' | 'all' = 'all',
  ) {
    const userPerms = new Set(await this.getUserPermissions(userId));
    return mode === 'all'
      ? permissions.every((p) => userPerms.has(p))
      : permissions.some((p) => userPerms.has(p));
  }
}
