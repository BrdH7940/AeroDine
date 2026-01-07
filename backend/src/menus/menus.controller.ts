import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger'

@ApiTags('menus')
@Controller()
export class MenusController {
    constructor(private readonly menusService: MenusService) {}

    // Categories
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('categories')
    createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: any) {
        const restaurantId = dto.restaurantId ?? user?.restaurantId
        return this.menusService.createCategory({
            ...dto,
            restaurantId,
        })
    }

    @Get('categories')
    getCategories(@Query('restaurantId') restaurantId: string) {
        return this.menusService.findAllCategories(Number(restaurantId))
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch('categories/:id')
    updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.menusService.updateCategory(+id, dto)
    }

    // Modifier Groups
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('modifiers')
    createModifierGroup(
        @Body() dto: CreateModifierGroupDto,
        @CurrentUser() user: any
    ) {
        const restaurantId = dto.restaurantId ?? user?.restaurantId
        return this.menusService.createModifierGroup({
            ...dto,
            restaurantId,
        })
    }

    @Get('modifiers')
    getModifierGroups(@Query('restaurantId') restaurantId: string) {
        return this.menusService.findAllModifierGroups(Number(restaurantId))
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('modifier-options')
    createModifierOption(@Body() dto: CreateModifierOptionDto) {
        return this.menusService.createModifierOption(dto)
    }

    // Menu Items
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('menu-items')
    createMenuItem(
        @Body() dto: CreateMenuItemDto,
        @CurrentUser() user: any
    ) {
        const restaurantId = dto.restaurantId ?? user?.restaurantId
        return this.menusService.createMenuItem({
            ...dto,
            restaurantId,
        })
    }

    @Get('menu-items')
    @ApiQuery({ name: 'restaurantId', required: true, type: Number })
    @ApiQuery({ name: 'q', required: false, type: String })
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
    updateMenuItem(
        @Param('id') id: string,
        @Body() dto: UpdateMenuItemDto
    ) {
        return this.menusService.updateMenuItem(+id, dto)
    }
}

