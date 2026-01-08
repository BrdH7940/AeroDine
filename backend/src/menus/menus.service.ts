import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CreateMenuDto, CreateMenuItemDto, CreateCategoryDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

type ItemStatus = 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN';

@Injectable()
export class MenusService {
  constructor(@Inject('PrismaClient') private readonly prisma: any) {}

  // Categories
  async getCategories(restaurantId?: number) {
    const where = restaurantId ? { restaurantId, restaurant: { isActive: true } } : { restaurant: { isActive: true } };
    return this.prisma.category.findMany({
      where,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        rank: 'asc',
      },
    });
  }

  async getCategoryById(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    // Verify restaurant exists and is active
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: createCategoryDto.restaurantId },
    });

    if (!restaurant || !restaurant.isActive) {
      throw new BadRequestException(`Restaurant with ID ${createCategoryDto.restaurantId} not found or inactive`);
    }

    return this.prisma.category.create({
      data: {
        restaurantId: createCategoryDto.restaurantId,
        name: createCategoryDto.name,
        image: createCategoryDto.image,
        rank: createCategoryDto.rank ?? 0,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateCategory(id: number, updateCategoryDto: Partial<CreateCategoryDto>) {
    const category = await this.getCategoryById(id);

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteCategory(id: number) {
    await this.getCategoryById(id);
    return this.prisma.category.delete({
      where: { id },
    });
  }

  // Menu Items
  async getMenuItems(restaurantId?: number, categoryId?: number, includeSoldOut = false) {
    const where: any = {
      restaurant: { isActive: true },
    };

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (!includeSoldOut) {
      where.status = 'AVAILABLE';
    }

    return this.prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        images: {
          orderBy: {
            rank: 'asc',
          },
        },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                options: {
                  where: {
                    isAvailable: true,
                  },
                  orderBy: {
                    id: 'asc',
                  },
                },
              },
            },
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMenuItemById(id: number) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: {
            rank: 'asc',
          },
        },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                options: {
                  where: {
                    isAvailable: true,
                  },
                  orderBy: {
                    id: 'asc',
                  },
                },
              },
            },
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return menuItem;
  }

  async getMenuItemsByCategory(categoryId: number, includeSoldOut = false) {
    const category = await this.getCategoryById(categoryId);
    return this.getMenuItems(undefined, categoryId, includeSoldOut);
  }

  async createMenuItem(createMenuItemDto: CreateMenuItemDto) {
    // Verify restaurant and category exist
    const [restaurant, category] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: createMenuItemDto.restaurantId },
      }),
      this.prisma.category.findUnique({
        where: { id: createMenuItemDto.categoryId },
      }),
    ]);

    if (!restaurant || !restaurant.isActive) {
      throw new BadRequestException(`Restaurant with ID ${createMenuItemDto.restaurantId} not found or inactive`);
    }

    if (!category) {
      throw new BadRequestException(`Category with ID ${createMenuItemDto.categoryId} not found`);
    }

    // Create menu item with images
    const { images, ...itemData } = createMenuItemDto;

    const menuItem = await this.prisma.menuItem.create({
      data: {
        ...itemData,
        status: (itemData.status ?? 'AVAILABLE') as ItemStatus,
        images: images
          ? {
              create: images.map((img) => ({
                url: img.url,
                rank: img.rank ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        images: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return menuItem;
  }

  async updateMenuItem(id: number, updateMenuItemDto: UpdateMenuDto) {
    await this.getMenuItemById(id);

    const { images, ...updateData } = updateMenuItemDto;

    // If images are provided, delete old ones and create new ones
    if (images) {
      await this.prisma.menuItemImage.deleteMany({
        where: { menuItemId: id },
      });
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...updateData,
        images: images
          ? {
              create: images.map((img: any) => ({
                url: img.url,
                rank: img.rank ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            rank: 'asc',
          },
        },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                options: true,
              },
            },
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteMenuItem(id: number) {
    await this.getMenuItemById(id);
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }

  // Legacy methods for compatibility
  create(createMenuDto: CreateMenuDto) {
    return this.createMenuItem(createMenuDto);
  }

  findAll(restaurantId?: number) {
    return this.getMenuItems(restaurantId);
  }

  findOne(id: number) {
    return this.getMenuItemById(id);
  }

  update(id: number, updateMenuDto: UpdateMenuDto) {
    return this.updateMenuItem(id, updateMenuDto);
  }

  remove(id: number) {
    return this.deleteMenuItem(id);
  }
}
