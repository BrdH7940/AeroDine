import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order.dto'
import { OrderStatus, OrderItemStatus } from '@aerodine/shared-types'
import { Decimal } from '@prisma/client/runtime/library'

interface TableTokenPayload {
    tableId: number
    restaurantId: number
}

@Injectable()
export class OrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    /**
     * Decode and verify table token
     */
    private async verifyTableToken(
        token: string
    ): Promise<{ tableId: number; restaurantId: number }> {
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }

        try {
            const payload = await this.jwtService.verifyAsync<TableTokenPayload>(
                token,
                { secret }
            )

            if (!payload.tableId || !payload.restaurantId) {
                throw new UnauthorizedException('Invalid table token payload')
            }

            return {
                tableId: payload.tableId,
                restaurantId: payload.restaurantId,
            }
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired table token')
        }
    }

    /**
     * Create a new order from QR token
     */
    async create(dto: CreateOrderDto) {
        // Step 1: Verify token
        const { tableId, restaurantId } = await this.verifyTableToken(
            dto.tableToken
        )

        // Step 2: Verify table exists and is active
        const table = await this.prisma.table.findUnique({
            where: { id: tableId },
            include: {
                restaurant: true,
            },
        })

        if (!table) {
            throw new NotFoundException(`Table with ID ${tableId} not found`)
        }

        if (!table.isActive) {
            throw new BadRequestException(
                `Table "${table.name}" is not active`
            )
        }

        // Verify restaurantId matches
        if (table.restaurantId !== restaurantId) {
            throw new BadRequestException(
                'Table token restaurantId does not match table'
            )
        }

        // Step 3: Price snapshot - Fetch menu items and modifiers
        const menuItemIds = dto.items.map((item) => item.menuItemId)
        const menuItems = await this.prisma.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
                restaurantId: restaurantId,
            },
        })

        if (menuItems.length !== menuItemIds.length) {
            const foundIds = menuItems.map((item) => item.id)
            const missingIds = menuItemIds.filter((id) => !foundIds.includes(id))
            throw new NotFoundException(
                `Menu items not found: ${missingIds.join(', ')}`
            )
        }

        // Fetch all modifier options
        const allModifierOptionIds = dto.items
            .flatMap((item) => item.modifierOptionIds || [])
            .filter((id): id is number => id !== undefined)

        let modifierOptions: Array<{
            id: number
            priceAdjustment: Decimal
            name: string
        }> = []

        if (allModifierOptionIds.length > 0) {
            modifierOptions = await this.prisma.modifierOption.findMany({
                where: {
                    id: { in: allModifierOptionIds },
                },
                select: {
                    id: true,
                    priceAdjustment: true,
                    name: true,
                },
            })

            if (modifierOptions.length !== allModifierOptionIds.length) {
                const foundIds = modifierOptions.map((opt) => opt.id)
                const missingIds = allModifierOptionIds.filter(
                    (id) => !foundIds.includes(id)
                )
                throw new NotFoundException(
                    `Modifier options not found: ${missingIds.join(', ')}`
                )
            }
        }

        // Calculate prices
        const orderItemsData = dto.items.map((itemDto) => {
            const menuItem = menuItems.find(
                (mi) => mi.id === itemDto.menuItemId
            )!

            // Calculate modifier adjustments
            const itemModifiers = (itemDto.modifierOptionIds || [])
                .map((optionId) =>
                    modifierOptions.find((opt) => opt.id === optionId)
                )
                .filter((opt): opt is NonNullable<typeof opt> => opt !== undefined)

            const modifierAdjustment = itemModifiers.reduce(
                (sum, opt) => sum + opt.priceAdjustment.toNumber(),
                0
            )

            const pricePerUnit =
                menuItem.basePrice.toNumber() + modifierAdjustment

            return {
                menuItem,
                itemDto,
                pricePerUnit,
                itemModifiers,
            }
        })

        // Calculate total amount
        const totalAmount = orderItemsData.reduce(
            (sum, item) => sum + item.pricePerUnit * item.itemDto.quantity,
            0
        )

        // Step 4: Transaction - Create order, items, and modifiers
        const order = await this.prisma.$transaction(async (tx) => {
            // Create order
            const createdOrder = await tx.order.create({
                data: {
                    restaurantId: restaurantId,
                    tableId: tableId,
                    guestCount: dto.guestCount,
                    totalAmount: totalAmount,
                    note: dto.note,
                    status: OrderStatus.PENDING,
                },
            })

            // Create order items
            const createdItems = await Promise.all(
                orderItemsData.map(async (itemData) => {
                    const orderItem = await tx.orderItem.create({
                        data: {
                            orderId: createdOrder.id,
                            menuItemId: itemData.menuItem.id,
                            name: itemData.menuItem.name,
                            quantity: itemData.itemDto.quantity,
                            pricePerUnit: itemData.pricePerUnit,
                            status: OrderItemStatus.QUEUED,
                            note: itemData.itemDto.note,
                        },
                    })

                    // Create modifiers if any
                    if (itemData.itemModifiers.length > 0) {
                        await Promise.all(
                            itemData.itemModifiers.map((modifier) =>
                                tx.orderItemModifier.create({
                                    data: {
                                        orderItemId: orderItem.id,
                                        modifierOptionId: modifier.id,
                                        modifierName: modifier.name,
                                        priceAdjustment: modifier.priceAdjustment,
                                    },
                                })
                            )
                        )
                    }

                    return orderItem
                })
            )

            // Fetch complete order with relations
            return tx.order.findUnique({
                where: { id: createdOrder.id },
                include: {
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    table: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    items: {
                        include: {
                            menuItem: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            modifiers: {
                                include: {
                                    modifierOption: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            })
        })

        if (!order) {
            throw new Error('Failed to create order')
        }

        return order
    }

    /**
     * Find all orders with filters
     */
    async findAll(status?: OrderStatus, restaurantId?: number) {
        const where: any = {}

        if (status) {
            where.status = status
        }

        if (restaurantId) {
            where.restaurantId = restaurantId
        }

        return this.prisma.order.findMany({
            where,
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                table: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                    },
                },
                waiter: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                    },
                },
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        modifiers: {
                            include: {
                                modifierOption: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'asc', // FIFO for KDS
            },
        })
    }

    /**
     * Find one order by ID
     */
    async findOne(id: number) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                table: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                    },
                },
                waiter: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                    },
                },
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        modifiers: {
                            include: {
                                modifierOption: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`)
        }

        return order
    }

    /**
     * Update order status
     */
    async updateStatus(id: number, dto: UpdateOrderStatusDto) {
        // Verify order exists
        await this.findOne(id)

        return this.prisma.order.update({
            where: { id },
            data: {
                status: dto.status as OrderStatus,
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                table: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        modifiers: {
                            include: {
                                modifierOption: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    /**
     * Update order item status
     */
    async updateItemStatus(
        orderId: number,
        itemId: number,
        status: OrderItemStatus
    ) {
        // Verify order exists
        const order = await this.findOne(orderId)

        // Verify item belongs to order
        const orderItem = order.items.find((item) => item.id === itemId)
        if (!orderItem) {
            throw new NotFoundException(
                `Order item with ID ${itemId} not found in order ${orderId}`
            )
        }

        return this.prisma.orderItem.update({
            where: { id: itemId },
            data: {
                status: status,
            },
            include: {
                menuItem: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                modifiers: {
                    include: {
                        modifierOption: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        })
    }
}
