import { Injectable } from '@nestjs/common'
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

    // Categories
    createCategory(dto: CreateCategoryDto) {
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
    createModifierGroup(dto: CreateModifierGroupDto) {
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

    createModifierOption(dto: CreateModifierOptionDto) {
        const { groupId, ...rest } = dto
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
