import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import { CreateTableDto } from './dto/create-table.dto'
import { UpdateTableDto } from './dto/update-table.dto'

@Injectable()
export class TablesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
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

    /**
     * Generate a JWT token for table QR code
     * Token contains: { tableId, restaurantId }
     * Uses JWT_SECRET with a long expiration (1 year)
     */
    async generateTableToken(tableId: number, restaurantId: number): Promise<string> {
        const payload = { tableId, restaurantId }
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }

        // Use a long expiration for QR tokens (1 year)
        const token = await this.jwtService.signAsync(payload, {
            secret,
            expiresIn: '365d',
        })

        return token
    }

    async create(dto: CreateTableDto) {
        // Validate restaurant exists
        await this.validateRestaurant(dto.restaurantId)

        // Create table with a temporary unique token first (since token is required and unique)
        const tempToken = `temp_${randomUUID()}`
        const table = await this.prisma.table.create({
            data: {
                restaurantId: dto.restaurantId,
                name: dto.name,
                capacity: dto.capacity,
                token: tempToken,
            },
        })

        // Generate and save the actual JWT token
        const token = await this.generateTableToken(table.id, dto.restaurantId)
        const updatedTable = await this.prisma.table.update({
            where: { id: table.id },
            data: { token },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        return updatedTable
    }

    async findAll(restaurantId?: number) {
        const where = restaurantId ? { restaurantId } : {}
        return this.prisma.table.findMany({
            where,
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        })
    }

    async findOne(id: number) {
        const table = await this.prisma.table.findUnique({
            where: { id },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        if (!table) {
            throw new NotFoundException(`Table with ID ${id} not found`)
        }

        return table
    }

    async update(id: number, dto: UpdateTableDto) {
        // Check if table exists
        await this.findOne(id)

        return this.prisma.table.update({
            where: { id },
            data: dto,
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })
    }

    async remove(id: number) {
        // Check if table exists
        await this.findOne(id)

        // Check if table has any orders
        const orderCount = await this.prisma.order.count({
            where: { tableId: id },
        })

        if (orderCount > 0) {
            throw new BadRequestException(
                `Cannot delete table with ID ${id}: it has ${orderCount} associated order(s)`
            )
        }

        return this.prisma.table.delete({
            where: { id },
        })
    }

    /**
     * Regenerate QR token for a table
     */
    async refreshToken(id: number) {
        const table = await this.findOne(id)
        const token = await this.generateTableToken(table.id, table.restaurantId)

        return this.prisma.table.update({
            where: { id },
            data: { token },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })
    }

    /**
     * Regenerate QR tokens for all tables
     */
    async refreshAllTokens(restaurantId?: number) {
        const where = restaurantId ? { restaurantId } : {}
        const tables = await this.prisma.table.findMany({
            where,
        })

        const updates = await Promise.all(
            tables.map(async (table) => {
                const token = await this.generateTableToken(
                    table.id,
                    table.restaurantId
                )
                return this.prisma.table.update({
                    where: { id: table.id },
                    data: { token },
                    include: {
                        restaurant: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                })
            })
        )

        return updates
    }

    /**
     * Get the full QR URL for a table
     */
    getQrUrl(token: string): string {
        const frontendUrl =
            this.configService.get<string>('frontend.url') ||
            'http://localhost:5173'
        // Ensure no trailing slash
        const baseUrl = frontendUrl.replace(/\/$/, '')
        return `${baseUrl}/menu?token=${token}`
    }

    /**
     * Verify table token and return tableId and restaurantId
     * Public method for validating QR code tokens
     */
    async verifyTableToken(token: string): Promise<{ tableId: number; restaurantId: number }> {
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }

        try {
            interface TableTokenPayload {
                tableId: number
                restaurantId: number
            }

            const payload = await this.jwtService.verifyAsync<TableTokenPayload>(token, {
                secret,
            })

            if (!payload.tableId || !payload.restaurantId) {
                throw new UnauthorizedException('Invalid table token payload')
            }

            // Verify that the table exists and is active
            const table = await this.prisma.table.findUnique({
                where: { id: payload.tableId },
            })

            if (!table) {
                throw new UnauthorizedException('Table not found')
            }

            if (!table.isActive) {
                throw new UnauthorizedException('Table is not active')
            }

            // Verify that the token matches the table's token (optional check for extra security)
            if (table.token !== token) {
                throw new UnauthorizedException('Token does not match table')
            }

            return {
                tableId: payload.tableId,
                restaurantId: payload.restaurantId,
            }
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error
            }
            throw new UnauthorizedException('Invalid or expired table token')
        }
    }
}

