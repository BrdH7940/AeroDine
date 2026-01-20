import {
    Injectable,
    NotFoundException,
    InternalServerErrorException,
    BadRequestException,
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
import * as levenshtein from 'fast-levenshtein'

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
                            modifierGroup: {
                                include: {
                                    options: true,
                                },
                            },
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

    async findAllMenuItems(restaurantId: number, query?: string, sortBy?: string) {
        // Get all menu items for the restaurant with order count for popularity
        const allItems = await this.prisma.menuItem.findMany({
            where: {
                restaurantId,
            },
            include: {
                images: true,
                category: true,
                modifierGroups: {
                    include: {
                        modifierGroup: {
                            include: {
                                options: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        orderItems: {
                            where: {
                                order: {
                                    status: 'COMPLETED' as any, // Prisma enum
                                },
                            },
                        },
                    },
                },
            },
        })

        // If no query, apply sorting
        if (!query || query.trim() === '') {
            if (sortBy === 'popularity') {
                // Sort by popularity (order count) descending
                return allItems.sort((a, b) => {
                    const countA = a._count?.orderItems || 0
                    const countB = b._count?.orderItems || 0
                    if (countA !== countB) {
                        return countB - countA // Descending
                    }
                    // If same popularity, sort by name
                    return a.name.localeCompare(b.name)
                })
            } else if (sortBy === 'price-asc') {
                return allItems.sort((a, b) => {
                    const priceA = Number(a.basePrice)
                    const priceB = Number(b.basePrice)
                    return priceA - priceB
                })
            } else if (sortBy === 'price-desc') {
                return allItems.sort((a, b) => {
                    const priceA = Number(a.basePrice)
                    const priceB = Number(b.basePrice)
                    return priceB - priceA
                })
            }
            // Default: sort by name
            return allItems.sort((a, b) => a.name.localeCompare(b.name))
        }

        const queryLower = query.toLowerCase().trim()
        const queryLength = queryLower.length

        // Calculate fuzzy match score for each item
        const itemsWithScore = allItems.map((item) => {
            const nameLower = item.name.toLowerCase()
            const descriptionLower = item.description?.toLowerCase() || ''

            // Calculate Levenshtein distance for name
            const nameDistance = levenshtein.get(queryLower, nameLower)
            const nameMaxLength = Math.max(queryLength, nameLower.length)
            const nameSimilarity = 1 - nameDistance / nameMaxLength

            // Calculate Levenshtein distance for description (if exists)
            let descriptionSimilarity = 0
            if (descriptionLower) {
                // Check if query appears in description (substring match)
                if (descriptionLower.includes(queryLower)) {
                    descriptionSimilarity = 0.5 // Bonus for substring match
                } else {
                    // Calculate minimum distance for any substring of description
                    let minDescriptionDistance = Infinity
                    for (let i = 0; i <= descriptionLower.length - queryLength; i++) {
                        const substring = descriptionLower.substring(
                            i,
                            i + queryLength
                        )
                        const distance = levenshtein.get(queryLower, substring)
                        minDescriptionDistance = Math.min(
                            minDescriptionDistance,
                            distance
                        )
                    }
                    if (minDescriptionDistance < Infinity) {
                        const maxDescLength = Math.max(
                            queryLength,
                            queryLength
                        )
                        descriptionSimilarity =
                            (1 - minDescriptionDistance / maxDescLength) * 0.3 // Lower weight for description
                    }
                }
            }

            // Combined score: name is more important (70%) than description (30%)
            const combinedScore = nameSimilarity * 0.7 + descriptionSimilarity * 0.3

            // Calculate maximum allowed distance based on query length
            // Allow up to 30% of query length as typos, or minimum 1-2 characters
            const maxAllowedDistance = Math.max(
                1,
                Math.ceil(queryLength * 0.3)
            )

            // Check if item matches (either exact/substring match or within typo tolerance)
            const exactMatch = nameLower.includes(queryLower)
            const withinTolerance = nameDistance <= maxAllowedDistance

            return {
                item,
                score: combinedScore,
                nameDistance,
                exactMatch,
                withinTolerance,
            }
        })

        // Filter items that match (exact match or within typo tolerance)
        const matchedItems = itemsWithScore.filter(
            ({ exactMatch, withinTolerance }) => exactMatch || withinTolerance
        )

        // Sort by: exact matches first, then by similarity score (highest first)
        // If sortBy is popularity, prioritize by order count
        if (sortBy === 'popularity') {
            matchedItems.sort((a, b) => {
                // Exact matches come first
                if (a.exactMatch && !b.exactMatch) return -1
                if (!a.exactMatch && b.exactMatch) return 1

                // Then by popularity (order count)
                const countA = a.item._count?.orderItems || 0
                const countB = b.item._count?.orderItems || 0
                if (countA !== countB) {
                    return countB - countA // Descending
                }

                // Then by score (higher is better)
                if (Math.abs(a.score - b.score) > 0.001) {
                    return b.score - a.score
                }

                // Finally, sort by name alphabetically
                return a.item.name.localeCompare(b.item.name)
            })
        } else {
            matchedItems.sort((a, b) => {
                // Exact matches come first
                if (a.exactMatch && !b.exactMatch) return -1
                if (!a.exactMatch && b.exactMatch) return 1

                // Then sort by score (higher is better)
                if (Math.abs(a.score - b.score) > 0.001) {
                    return b.score - a.score
                }

                // Finally, sort by name alphabetically
                return a.item.name.localeCompare(b.item.name)
            })
        }

        // Return only the items (without score metadata)
        return matchedItems.map(({ item }) => item)
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
                        include: {
                            modifierGroup: {
                                include: {
                                    options: true,
                                },
                            },
                        },
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

    async getMenuItemReviews(menuItemId: number) {
        // Check if menu item exists
        const menuItem = await this.prisma.menuItem.findUnique({
            where: { id: menuItemId },
        })

        if (!menuItem) {
            throw new NotFoundException(`Menu item with ID ${menuItemId} not found`)
        }

        // Get all reviews for this menu item
        const reviews = await this.prisma.review.findMany({
            where: { menuItemId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // Calculate average rating
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0

        // Map reviews to response format
        const mappedReviews = reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            user: {
                id: review.user.id,
                fullName: review.user.fullName,
                email: review.user.email,
            },
        }))

        return {
            menuItemId,
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
            totalReviews: reviews.length,
            reviews: mappedReviews,
        }
    }

    async createReview(
        menuItemId: number,
        userId: number,
        rating: number,
        comment?: string
    ) {
        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5')
        }

        // Check if menu item exists
        const menuItem = await this.prisma.menuItem.findUnique({
            where: { id: menuItemId },
        })

        if (!menuItem) {
            throw new NotFoundException(`Menu item with ID ${menuItemId} not found`)
        }

        // Check if user has ordered this item (at least once in a completed order)
        const hasOrdered = await this.prisma.orderItem.findFirst({
            where: {
                menuItemId,
                order: {
                    userId,
                    status: 'COMPLETED' as any, // Prisma enum
                },
            },
        })

        if (!hasOrdered) {
            throw new BadRequestException(
                'You can only review items you have ordered'
            )
        }

        // Check if user already reviewed this item
        const existingReview = await this.prisma.review.findFirst({
            where: {
                menuItemId,
                userId,
            },
        })

        if (existingReview) {
            // Update existing review
            return this.prisma.review.update({
                where: { id: existingReview.id },
                data: {
                    rating,
                    comment: comment || null,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                        },
                    },
                },
            })
        }

        // Create new review
        return this.prisma.review.create({
            data: {
                menuItemId,
                userId,
                rating,
                comment: comment || null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
        })
    }
}
