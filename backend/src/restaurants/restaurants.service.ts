import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { UpdateRestaurantDto } from './dto/update-restaurant.dto'

@Injectable()
export class RestaurantsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get the first restaurant (assuming single restaurant system)
     * In a multi-restaurant system, this would need restaurantId parameter
     */
    async findOne(id?: number) {
        const restaurant = id
            ? await this.prisma.restaurant.findUnique({
                  where: { id },
              })
            : await this.prisma.restaurant.findFirst()

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found')
        }

        return restaurant
    }

    /**
     * Get all restaurants
     */
    async findAll() {
        return this.prisma.restaurant.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        })
    }

    /**
     * Update restaurant
     */
    async update(id: number, dto: UpdateRestaurantDto) {
        // Check if restaurant exists
        await this.findOne(id)

        return this.prisma.restaurant.update({
            where: { id },
            data: dto,
        })
    }
}
