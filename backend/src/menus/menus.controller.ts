import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateMenuDto, CreateMenuItemDto, CreateCategoryDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  // Categories endpoints
  @Get('categories')
  getCategories(@Query('restaurantId') restaurantId?: string) {
    return this.menusService.getCategories(restaurantId ? +restaurantId : undefined);
  }

  @Get('categories/:id')
  getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.menusService.getCategoryById(id);
  }

  @Post('categories')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.menusService.createCategory(createCategoryDto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: Partial<CreateCategoryDto>) {
    return this.menusService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.menusService.deleteCategory(id);
  }

  // Menu items endpoints
  @Get('items')
  getMenuItems(
    @Query('restaurantId') restaurantId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('includeSoldOut') includeSoldOut?: string,
  ) {
    return this.menusService.getMenuItems(
      restaurantId ? +restaurantId : undefined,
      categoryId ? +categoryId : undefined,
      includeSoldOut === 'true',
    );
  }

  @Get('items/:id')
  getMenuItemById(@Param('id', ParseIntPipe) id: number) {
    return this.menusService.getMenuItemById(id);
  }

  @Get('categories/:categoryId/items')
  getMenuItemsByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query('includeSoldOut') includeSoldOut?: string,
  ) {
    return this.menusService.getMenuItemsByCategory(categoryId, includeSoldOut === 'true');
  }

  @Post('items')
  createMenuItem(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menusService.createMenuItem(createMenuItemDto);
  }

  @Patch('items/:id')
  updateMenuItem(@Param('id', ParseIntPipe) id: number, @Body() updateMenuItemDto: UpdateMenuDto) {
    return this.menusService.updateMenuItem(id, updateMenuItemDto);
  }

  @Delete('items/:id')
  deleteMenuItem(@Param('id', ParseIntPipe) id: number) {
    return this.menusService.deleteMenuItem(id);
  }

  // Legacy endpoints for backward compatibility
  @Post()
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menusService.create(createMenuDto);
  }

  @Get()
  findAll(@Query('restaurantId') restaurantId?: string) {
    return this.menusService.findAll(restaurantId ? +restaurantId : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menusService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menusService.update(id, updateMenuDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menusService.remove(id);
  }
}
