import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException } from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole } from '@aerodine/shared-types'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Create a new user (ADMIN only)',
    description: 'Only ADMIN can create WAITER and KITCHEN staff accounts',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({
    summary: 'Get all users (ADMIN only)',
    description: 'Returns list of all users. Only ADMIN can access this endpoint.',
  })
  findAll() {
    return this.usersService.findAll()
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Users can view their own profile. ADMIN can view any user profile.',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = +id
    // Users can only view their own profile unless they are ADMIN
    if (user.role !== UserRole.ADMIN && user.id !== userId) {
      throw new ForbiddenException('You can only view your own profile')
    }
    return this.usersService.findById(userId)
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Users can update their own profile (limited fields). ADMIN can update any user.',
  })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @CurrentUser() user: any) {
    const userId = +id
    // Users can only update their own profile unless they are ADMIN
    if (user.role !== UserRole.ADMIN && user.id !== userId) {
      throw new ForbiddenException('You can only update your own profile')
    }
    
    // Non-admin users cannot change their role or isActive status
    if (user.role !== UserRole.ADMIN) {
      delete updateUserDto.role
      // Note: isActive is not in UpdateUserDto, but we ensure it can't be changed
    }
    
    return this.usersService.update(userId, updateUserDto)
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Toggle user active status (ADMIN only)',
    description: 'Activate or deactivate a user account',
  })
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(+id)
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user (ADMIN only)',
    description: 'Permanently delete a user account. Only ADMIN can delete users.',
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id)
  }
}
