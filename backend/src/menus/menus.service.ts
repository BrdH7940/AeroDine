import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CreateMenuDto, CreateMenuItemDto, CreateCategoryDto, CreateModifierGroupDto, CreateModifierOptionDto, UpdateModifierGroupDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

type ItemStatus = 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN';

@Injectable()
export class MenusService {
  constructor(@Inject('PrismaClient') private readonly prisma: any) {}

  // Categories
  async getCategories(restaurantId?: number) {
    try {
      const where: any = {
        restaurant: {
          isActive: true,
        },
      };
      
      if (restaurantId) {
        where.restaurantId = restaurantId;
      }

      return await this.prisma.category.findMany({
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
    } catch (error) {
      console.error('Error in getCategories service:', error);
      throw error;
    }
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
    try {
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

      return await this.prisma.menuItem.findMany({
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
    } catch (error) {
      console.error('Error in getMenuItems service:', error);
      throw error;
    }
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

    // Create menu item with images and modifier groups
    const { images, modifierGroupIds, ...itemData } = createMenuItemDto;

    // Verify modifier groups exist and belong to the same restaurant
    if (modifierGroupIds && modifierGroupIds.length > 0) {
      const modifierGroups = await this.prisma.modifierGroup.findMany({
        where: {
          id: { in: modifierGroupIds },
          restaurantId: createMenuItemDto.restaurantId,
        },
      });

      if (modifierGroups.length !== modifierGroupIds.length) {
        throw new BadRequestException('One or more modifier groups not found or do not belong to this restaurant');
      }
    }

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
        modifierGroups: modifierGroupIds && modifierGroupIds.length > 0
          ? {
              create: modifierGroupIds.map((groupId) => ({
                groupId,
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

    return menuItem;
  }

  async updateMenuItem(id: number, updateMenuItemDto: UpdateMenuDto) {
    const existingItem = await this.getMenuItemById(id);

    const { images, modifierGroupIds, ...updateData } = updateMenuItemDto;

    // If images are provided, delete old ones and create new ones
    if (images) {
      await this.prisma.menuItemImage.deleteMany({
        where: { menuItemId: id },
      });
    }

    // If modifierGroupIds are provided, update the associations
    if (modifierGroupIds !== undefined) {
      const restaurantId = updateData.restaurantId || existingItem.restaurantId;

      // Verify modifier groups exist and belong to the same restaurant
      if (modifierGroupIds.length > 0) {
        const modifierGroups = await this.prisma.modifierGroup.findMany({
          where: {
            id: { in: modifierGroupIds },
            restaurantId,
          },
        });

        if (modifierGroups.length !== modifierGroupIds.length) {
          throw new BadRequestException('One or more modifier groups not found or do not belong to this restaurant');
        }
      }

      // Delete existing associations
      await this.prisma.itemModifierGroup.deleteMany({
        where: { itemId: id },
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
        modifierGroups: modifierGroupIds !== undefined
          ? {
              create: modifierGroupIds.map((groupId) => ({
                groupId,
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

  // Modifier Groups Management
  async getModifierGroups(restaurantId?: number) {
    const where = restaurantId ? { restaurantId } : {};
    return this.prisma.modifierGroup.findMany({
      where,
      include: {
        options: {
          orderBy: {
            id: 'asc',
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async getModifierGroupById(id: number) {
    const group = await this.prisma.modifierGroup.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: {
            id: 'asc',
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

    if (!group) {
      throw new NotFoundException(`Modifier group with ID ${id} not found`);
    }

    return group;
  }

  async createModifierGroup(createModifierGroupDto: CreateModifierGroupDto) {
    // Verify restaurant exists and is active
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: createModifierGroupDto.restaurantId },
    });

    if (!restaurant || !restaurant.isActive) {
      throw new BadRequestException(`Restaurant with ID ${createModifierGroupDto.restaurantId} not found or inactive`);
    }

    const { options, ...groupData } = createModifierGroupDto;

    return this.prisma.modifierGroup.create({
      data: {
        ...groupData,
        minSelection: groupData.minSelection ?? 0,
        maxSelection: groupData.maxSelection ?? 1,
        options: options
          ? {
              create: options.map((opt) => ({
                name: opt.name,
                priceAdjustment: opt.priceAdjustment ?? 0,
                isAvailable: opt.isAvailable ?? true,
              })),
            }
          : undefined,
      },
      include: {
        options: {
          orderBy: {
            id: 'asc',
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

  async updateModifierGroup(id: number, updateModifierGroupDto: UpdateModifierGroupDto) {
    await this.getModifierGroupById(id);

    const { options, ...updateData } = updateModifierGroupDto;

    // If options are provided, delete old ones and create new ones
    if (options) {
      await this.prisma.modifierOption.deleteMany({
        where: { groupId: id },
      });
    }

    return this.prisma.modifierGroup.update({
      where: { id },
      data: {
        ...updateData,
        options: options
          ? {
              create: options.map((opt) => ({
                name: opt.name,
                priceAdjustment: opt.priceAdjustment ?? 0,
                isAvailable: opt.isAvailable ?? true,
              })),
            }
          : undefined,
      },
      include: {
        options: {
          orderBy: {
            id: 'asc',
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

  async deleteModifierGroup(id: number) {
    await this.getModifierGroupById(id);
    return this.prisma.modifierGroup.delete({
      where: { id },
    });
  }

  // Modifier Options Management
  async createModifierOption(groupId: number, createOptionDto: CreateModifierOptionDto) {
    await this.getModifierGroupById(groupId);

    return this.prisma.modifierOption.create({
      data: {
        groupId,
        name: createOptionDto.name,
        priceAdjustment: createOptionDto.priceAdjustment ?? 0,
        isAvailable: createOptionDto.isAvailable ?? true,
      },
      include: {
        group: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async updateModifierOption(id: number, updateOptionDto: Partial<CreateModifierOptionDto>) {
    const option = await this.prisma.modifierOption.findUnique({
      where: { id },
    });

    if (!option) {
      throw new NotFoundException(`Modifier option with ID ${id} not found`);
    }

    return this.prisma.modifierOption.update({
      where: { id },
      data: updateOptionDto,
      include: {
        group: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteModifierOption(id: number) {
    const option = await this.prisma.modifierOption.findUnique({
      where: { id },
    });

    if (!option) {
      throw new NotFoundException(`Modifier option with ID ${id} not found`);
    }

    return this.prisma.modifierOption.delete({
      where: { id },
    });
  }
}
