import { Injectable, NotFoundException } from '@nestjs/common'
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
            const result = await this.cloudinary.uploadImage(image)
            uploadedImageUrl = result.secure_url
        }

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

        return created
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

    updateMenuItem(id: number, dto: UpdateMenuItemDto) {
        const { modifierGroupIds, ...rest } = dto

        return this.prisma.menuItem.update({
            where: { id },
            data: {
                ...rest,
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
    }
}
