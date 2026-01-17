import {
    Injectable,
    NotFoundException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CloudinaryService } from '../common/cloudinary/cloudinary.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto'
import { CreateModifierOptionDto } from './dto/create-modifier-option.dto'

@Injectable()
export class MenusService {
    private readonly logger = new Logger(MenusService.name)

    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService
    ) {}

    private async validateRestaurant(restaurantId: number): Promise<void> {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        })
        if (!restaurant) {
            throw new NotFoundException(
                `Restaurant with ID ${restaurantId} not found`
            )
        }
    }

    // Categories
    async createCategory(dto: CreateCategoryDto) {
        await this.validateRestaurant(dto.restaurantId)
        return this.prisma.category.create({
            data: dto,
        })
    }

    findAllCategories(restaurantId: number) {
        return this.prisma.category.findMany({
            where: { restaurantId },
            orderBy: { rank: 'asc' },
        })
    }

    updateCategory(id: number, dto: UpdateCategoryDto) {
        return this.prisma.category.update({
            where: { id },
            data: dto,
        })
    }

    async deleteCategory(id: number) {
        // Check if category exists
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: { items: true },
        })

        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`)
        }

        // Delete category (cascade will delete all menu items)
        return this.prisma.category.delete({
            where: { id },
        })
    }

    // Modifier groups
    async createModifierGroup(dto: CreateModifierGroupDto) {
        await this.validateRestaurant(dto.restaurantId)
        return this.prisma.modifierGroup.create({
            data: dto,
        })
    }

    findAllModifierGroups(restaurantId: number) {
        return this.prisma.modifierGroup.findMany({
            where: { restaurantId },
            include: { options: true },
        })
    }

    async createModifierOption(dto: CreateModifierOptionDto) {
        const { groupId, ...rest } = dto
        // Validate modifier group exists
        const group = await this.prisma.modifierGroup.findUnique({
            where: { id: groupId },
        })
        if (!group) {
            throw new NotFoundException(
                `Modifier group with ID ${groupId} not found`
            )
        }
        return this.prisma.modifierOption.create({
            data: {
                ...rest,
                group: {
                    connect: { id: groupId },
                },
            },
        })
    }

    // Menu items
    async createMenuItem(dto: CreateMenuItemDto) {
        const { image, modifierGroupIds, ...rest } = dto

        // Validate restaurant and category exist
        await this.validateRestaurant(dto.restaurantId)
        const category = await this.prisma.category.findUnique({
            where: { id: dto.categoryId },
        })
        if (!category) {
            throw new NotFoundException(
                `Category with ID ${dto.categoryId} not found`
            )
        }

        // Validate modifier groups if provided
        if (modifierGroupIds && modifierGroupIds.length > 0) {
            const groups = await this.prisma.modifierGroup.findMany({
                where: {
                    id: { in: modifierGroupIds },
                    restaurantId: dto.restaurantId,
                },
            })
            if (groups.length !== modifierGroupIds.length) {
                throw new NotFoundException(
                    'One or more modifier groups not found or do not belong to this restaurant'
                )
            }
        }

        let uploadedImageUrl: string | undefined
        if (image) {
            try {
                this.logger.log('Uploading image to Cloudinary...')
                const result = await this.cloudinary.uploadImage(image)
                uploadedImageUrl = result.secure_url
                this.logger.log('Image uploaded successfully')
            } catch (error) {
                this.logger.error('Failed to upload image to Cloudinary', error)
                throw new InternalServerErrorException(
                    `Failed to upload image: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`
                )
            }
        }

        try {
            const created = await this.prisma.menuItem.create({
                data: {
                    ...rest,
                    images: uploadedImageUrl
                        ? {
                              create: [
                                  {
                                      url: uploadedImageUrl,
                                      rank: 0,
                                  },
                              ],
                          }
                        : undefined,
                    modifierGroups: modifierGroupIds?.length
                        ? {
                              createMany: {
                                  data: modifierGroupIds.map((groupId) => ({
                                      groupId,
                                  })),
                              },
                          }
                        : undefined,
                },
                include: {
                    images: true,
                    category: true,
                    modifierGroups: {
                        include: {
                            modifierGroup: true,
                        },
                    },
                },
            })

            this.logger.log(`Menu item created successfully: ${created.id}`)
            return created
        } catch (error) {
            this.logger.error('Failed to create menu item', error)
            throw new InternalServerErrorException(
                `Failed to create menu item: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            )
        }
    }

    findAllMenuItems(restaurantId: number, query?: string) {
        return this.prisma.menuItem.findMany({
            where: {
                restaurantId,
                name: query
                    ? {
                          contains: query,
                          mode: 'insensitive',
                      }
                    : undefined,
            },
            include: {
                images: true,
                category: true,
                modifierGroups: {
                    include: { modifierGroup: true },
                },
            },
            orderBy: {
                name: 'asc',
            },
        })
    }

    async updateMenuItem(id: number, dto: UpdateMenuItemDto) {
        const { modifierGroupIds, categoryId, image, restaurantId, ...rest } =
            dto

        // Validate category exists if categoryId is provided
        if (categoryId !== undefined) {
            const category = await this.prisma.category.findUnique({
                where: { id: categoryId },
            })
            if (!category) {
                throw new NotFoundException(
                    `Category with ID ${categoryId} not found`
                )
            }
        }

        // Handle image upload if provided
        let uploadedImageUrl: string | undefined
        if (image) {
            try {
                this.logger.log('Uploading image to Cloudinary for update...')
                const result = await this.cloudinary.uploadImage(image)
                uploadedImageUrl = result.secure_url
                this.logger.log('Image uploaded successfully')
            } catch (error) {
                this.logger.error('Failed to upload image to Cloudinary', error)
                throw new InternalServerErrorException(
                    `Failed to upload image: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`
                )
            }
        }

        // Get current menu item to delete old images if needed
        const currentItem = await this.prisma.menuItem.findUnique({
            where: { id },
            include: { images: true },
        })

        if (!currentItem) {
            throw new NotFoundException(`Menu item with ID ${id} not found`)
        }

        try {
            const updated = await this.prisma.menuItem.update({
                where: { id },
                data: {
                    ...rest,
                    // Update category using relation
                    category: categoryId !== undefined
                        ? { connect: { id: categoryId } }
                        : undefined,
                    // Update images: delete old ones and create new one if image uploaded
                    images: uploadedImageUrl
                        ? {
                              deleteMany: {},
                              create: [
                                  {
                                      url: uploadedImageUrl,
                                      rank: 0,
                                  },
                              ],
                          }
                        : undefined,
                    // For simplicity we only add new modifier groups; managing removal can be added later
                    modifierGroups: modifierGroupIds?.length
                        ? {
                              createMany: {
                                  data: modifierGroupIds.map((groupId) => ({
                                      groupId,
                                  })),
                              },
                          }
                        : undefined,
                },
                include: {
                    images: true,
                    category: true,
                    modifierGroups: {
                        include: { modifierGroup: true },
                    },
                },
            })

            this.logger.log(`Menu item updated successfully: ${id}`)
            return updated
        } catch (error) {
            this.logger.error('Failed to update menu item', error)
            throw new InternalServerErrorException(
                `Failed to update menu item: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            )
        }
    }

    async deleteMenuItem(id: number) {
        // Check if menu item exists
        const menuItem = await this.prisma.menuItem.findUnique({
            where: { id },
        })

        if (!menuItem) {
            throw new NotFoundException(`Menu item with ID ${id} not found`)
        }

        // Delete menu item (cascade will delete images, modifier groups, etc.)
        return this.prisma.menuItem.delete({
            where: { id },
        })
    }
}
