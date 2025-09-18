import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import { AssignRoleDto, assignRoleSchema } from './dto/assign-role.dto';
import {
  CreateRolePermissionsDto,
  createRolePermissionsSchema,
} from './dto/create.role.dto';
import { RoleService } from './role.service';

@Controller('roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // Create Role & Assign Permissions
  @Post()
  @UsePipes(new ZodValidationPipe(createRolePermissionsSchema))
  @Permissions('role.create')
  create(@Body() body: CreateRolePermissionsDto) {
    return this.roleService.createRolePermissions(body);
  }

  // Get All Roles
  @Get()
  @Permissions('role.read')
  findAllRoles() {
    return this.roleService.getAllRoles();
  }

  // Get All Permissions
  @Get('permissions')
  @Permissions('role.read', 'admin.role.view')
  findAllPermissions() {
    return this.roleService.getAllPermissions();
  }

  // Get Role and it's permissions
  @Get(':id/permissions')
  @Permissions('role.read', 'admin.role.permissions.view')
  findRoleWithPermissions(@Param() param: { id: string }) {
    return this.roleService.getRolePermissions(param.id);
  }

  // Update Role Permissions
  @Put(':id/permissions')
  @Permissions('role.update')
  updateRolePermissions(
    @Param() param: { id: string },
    @Body() body: CreateRolePermissionsDto,
  ) {
    return this.roleService.updateRolePermissions(param.id, body);
  }

  // Delete Role
  @Delete(':id')
  @Permissions('role.delete')
  deleteRole(@Param() param: { id: string }) {
    return this.roleService.deleteRole(param.id);
  }

  // Assign role to user
  @Post('users/:userId/assign')
  @UsePipes(new ZodValidationPipe(assignRoleSchema))
  @Permissions('role.assign')
  assignRole(@Param() param: { userId: string }, @Body() body: AssignRoleDto) {
    // Prefer param userId if provided; body for validation consistency
    const userId = param.userId || body.userId;
    return this.roleService.assignRoleToUser(userId, body.roleId);
  }

  // Remove role from user
  @Delete('users/:userId/roles/:roleId')
  @Permissions('role.revoke')
  removeRole(@Param() param: { userId: string; roleId: string }) {
    return this.roleService.removeRoleFromUser(param.userId, param.roleId);
  }

  // Get roles for a user
  @Get('users/:userId/roles')
  @Permissions('role.user.read')
  getUserRoles(@Param() param: { userId: string }) {
    return this.roleService.getUserRoles(param.userId);
  }

  // Get permissions for a user
  @Get('users/:userId/permissions')
  @Permissions('role.user.read')
  getUserPermissions(@Param() param: { userId: string }) {
    return this.roleService.getUserPermissions(param.userId);
  }
}
