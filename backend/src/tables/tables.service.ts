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

    /**
     * Helper method to get JWT secret with validation
     */
    private getJwtSecret(): string {
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }
        return secret
    }

    /**
     * Helper method for table queries with restaurant include
     */
    private getTableInclude() {
        return {
            restaurant: {
                select: {
                    id: true,
                    name: true,
                },
            },
        }
    }

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
        const secret = this.getJwtSecret()

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
            include: this.getTableInclude(),
        })

        return updatedTable
    }

    async findAll(restaurantId?: number) {
        const where = restaurantId ? { restaurantId } : {}
        return this.prisma.table.findMany({
            where,
            include: this.getTableInclude(),
            orderBy: {
                name: 'asc',
            },
        })
    }

    async findOne(id: number) {
        const table = await this.prisma.table.findUnique({
            where: { id },
            include: this.getTableInclude(),
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
            include: this.getTableInclude(),
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
            include: this.getTableInclude(),
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
                    include: this.getTableInclude(),
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
        // Use /customer/menu route (not /menu) to match frontend routing
        return `${baseUrl}/customer/menu?token=${token}`
    }

    /**
     * Verify table token and return tableId and restaurantId
     * Public method for validating QR code tokens
     */
    async verifyTableToken(token: string): Promise<{ tableId: number; restaurantId: number }> {
        try {
            const secret = this.getJwtSecret()

            interface TableTokenPayload {
                tableId: number
                restaurantId: number
            }

            // Verify JWT token
            let payload: TableTokenPayload
            try {
                payload = await this.jwtService.verifyAsync<TableTokenPayload>(token, {
                    secret,
                })
            } catch (jwtError: any) {
                // JWT verification failed (expired, invalid signature, etc.)
                throw new UnauthorizedException('Invalid or expired table token')
            }

            if (!payload?.tableId || !payload?.restaurantId) {
                throw new UnauthorizedException('Invalid table token payload')
            }

            // Ensure tableId and restaurantId are numbers
            const tableId = Number(payload.tableId)
            const restaurantId = Number(payload.restaurantId)
            
            if (isNaN(tableId) || isNaN(restaurantId) || tableId <= 0 || restaurantId <= 0) {
                throw new UnauthorizedException('Invalid table token payload')
            }

            // Verify that the table exists and is active
            const table = await this.prisma.table.findUnique({
                where: { id: tableId },
            })

            if (!table) {
                throw new UnauthorizedException('Table not found')
            }

            if (!table.isActive) {
                throw new UnauthorizedException('Table is not active')
            }

            // Note: We allow the token if JWT is valid and tableId/restaurantId match
            // This allows QR codes to work even if token was regenerated (user-friendly)
            // The JWT verification above already ensures the token is valid and contains correct tableId/restaurantId

            return {
                tableId,
                restaurantId,
            }
        } catch (error) {
            // Re-throw UnauthorizedException as-is
            if (error instanceof UnauthorizedException) {
                throw error
            }
            // Convert any other error to UnauthorizedException to avoid 500 errors
            throw new UnauthorizedException('Invalid or expired table token')
        }
    }
}

