import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    BadRequestException,
} from '@nestjs/common'
import { MenusService } from './menus.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto'
import { CreateModifierOptionDto } from './dto/create-modifier-option.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@aerodine/shared-types'
import { ApiBearerAuth, ApiQuery, ApiTags, ApiOperation } from '@nestjs/swagger'

@ApiTags('menus')
@Controller()
export class MenusController {
    constructor(private readonly menusService: MenusService) {}

    // Categories
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('categories')
    @ApiOperation({
        summary: 'Create category (ADMIN only)',
        description:
            'ADMIN must specify restaurantId to create category for any restaurant',
    })
    createCategory(@Body() dto: CreateCategoryDto) {
        // ADMIN must specify restaurantId explicitly
        if (!dto.restaurantId) {
            throw new BadRequestException('restaurantId is required')
        }
        return this.menusService.createCategory(dto)
    }

    @Get('categories')
    @ApiOperation({ summary: 'Get all categories for a restaurant (Public)' })
    @ApiQuery({ name: 'restaurantId', required: true, type: Number })
    getCategories(@Query('restaurantId') restaurantId: string) {
        return this.menusService.findAllCategories(Number(restaurantId))
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch('categories/:id')
    @ApiOperation({ summary: 'Update category (ADMIN only)' })
    updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.menusService.updateCategory(+id, dto)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Delete('categories/:id')
    @ApiOperation({
        summary: 'Delete category (ADMIN only)',
        description:
            'Deletes a category. Will cascade delete all menu items in this category.',
    })
    deleteCategory(@Param('id') id: string) {
        return this.menusService.deleteCategory(+id)
    }

    // Modifier Groups
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('modifiers')
    @ApiOperation({
        summary: 'Create modifier group (ADMIN only)',
        description: 'ADMIN must specify restaurantId',
    })
    createModifierGroup(@Body() dto: CreateModifierGroupDto) {
        // ADMIN must specify restaurantId explicitly
        if (!dto.restaurantId) {
            throw new BadRequestException('restaurantId is required')
        }
        return this.menusService.createModifierGroup(dto)
    }

    @Get('modifiers')
    @ApiOperation({
        summary: 'Get all modifier groups for a restaurant (Public)',
    })
    @ApiQuery({ name: 'restaurantId', required: true, type: Number })
    getModifierGroups(@Query('restaurantId') restaurantId: string) {
        return this.menusService.findAllModifierGroups(Number(restaurantId))
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('modifier-options')
    @ApiOperation({ summary: 'Create modifier option (ADMIN only)' })
    createModifierOption(@Body() dto: CreateModifierOptionDto) {
        return this.menusService.createModifierOption(dto)
    }

    // Menu Items
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('menu-items')
    @ApiOperation({
        summary: 'Create menu item with image upload (ADMIN only)',
        description:
            'ADMIN must specify restaurantId. Optional image field for Cloudinary upload.',
    })
    createMenuItem(@Body() dto: CreateMenuItemDto) {
        // ADMIN must specify restaurantId explicitly
        if (!dto.restaurantId) {
            throw new BadRequestException('restaurantId is required')
        }
        return this.menusService.createMenuItem(dto)
    }

    @Get('menu-items')
    @ApiOperation({
        summary: 'Get menu items with fuzzy search (Public)',
        description:
            'Search by name (case-insensitive) using query param ?q=...',
    })
    @ApiQuery({ name: 'restaurantId', required: true, type: Number })
    @ApiQuery({
        name: 'q',
        required: false,
        type: String,
        description: 'Search query for fuzzy name matching',
    })
    getMenuItems(
        @Query('restaurantId') restaurantId: string,
        @Query('q') q?: string
    ) {
        return this.menusService.findAllMenuItems(Number(restaurantId), q)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch('menu-items/:id')
    @ApiOperation({ summary: 'Update menu item (ADMIN only)' })
    updateMenuItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
        return this.menusService.updateMenuItem(+id, dto)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Delete('menu-items/:id')
    @ApiOperation({
        summary: 'Delete menu item (ADMIN only)',
        description:
            'Permanently deletes a menu item. Use with caution as it will remove all associated data.',
    })
    deleteMenuItem(@Param('id') id: string) {
        return this.menusService.deleteMenuItem(+id)
    }

    @Get('menu-items/:id/reviews')
    @ApiOperation({
        summary: 'Get reviews and rating for a menu item (Public)',
        description: 'Returns reviews and average rating for a specific menu item',
    })
    getMenuItemReviews(@Param('id') id: string) {
        return this.menusService.getMenuItemReviews(+id)
    }
}

