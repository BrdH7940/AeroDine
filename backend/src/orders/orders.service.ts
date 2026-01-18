import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    Logger,
} from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { SocketService } from '../socket/socket.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import {
    CreateOrderDto,
    CreateOrderItemDto,
    AddItemsToOrderDto,
} from './dto/create-order.dto'
import {
    UpdateOrderDto,
    UpdateOrderItemStatusDto,
    AssignWaiterDto,
} from './dto/update-order.dto'
import {
    OrderStatus,
    OrderItemStatus,
    TableStatus,
    Prisma,
} from '@prisma/client'
import {
    OrderCreatedEvent,
    OrderUpdatedEvent,
    OrderStatusChangedEvent,
    OrderItemStatusChangedEvent,
    KitchenOrderEvent,
    OrderSummary,
    OrderItemSummary,
    KitchenOrderView,
    KitchenItemView,
    canTransitionOrderStatus,
    canTransitionOrderItemStatus,
    OrderStatus as SharedOrderStatus,
    OrderItemStatus as SharedOrderItemStatus,
} from '@aerodine/shared-types'
import Stripe from 'stripe'

interface TableTokenPayload {
    tableId: number
    restaurantId: number
}

/**
 * Orders Service - Handles all order-related business logic
 * Includes order management, status transitions, and real-time notifications
 *
 * @author Dev 2 - Operations Team
 */
@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name)
    private stripe: Stripe | null = null

    constructor(
        private readonly prisma: PrismaService,
        private readonly socketService: SocketService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {
        // Initialize Stripe if configured
        const stripeSecretKey =
            this.configService.get<string>('stripe.secretKey') ||
            this.configService.get<string>('STRIPE_SECRET_KEY') ||
            process.env.STRIPE_SECRET_KEY

        if (stripeSecretKey && stripeSecretKey.trim().length > 0) {
            try {
                this.stripe = new Stripe(stripeSecretKey.trim(), {
                    apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
                })
                this.logger.log('Stripe client initialized successfully')
            } catch (error) {
                this.logger.error('Failed to initialize Stripe client:', error)
            }
        } else {
            this.logger.warn(
                'STRIPE_SECRET_KEY is not set. Stripe features will be disabled.'
            )
        }
    }

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
            const payload =
                await this.jwtService.verifyAsync<TableTokenPayload>(token, {
                    secret,
                })

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

    // ========================================================================
    // ORDER CRUD
    // ========================================================================

    /**
     * Create a new order
     */
    async create(createOrderDto: CreateOrderDto) {
        const { restaurantId, tableId, userId, guestCount, note, items } =
            createOrderDto

        // Verify table exists and belongs to restaurant
        const table = await this.prisma.table.findFirst({
            where: { id: tableId, restaurantId, isActive: true },
        })

        if (!table) {
            throw new NotFoundException('Table not found')
        }

        // Calculate total amount
        let totalAmount = 0
        const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = []

        for (const item of items) {
            const menuItem = await this.prisma.menuItem.findFirst({
                where: {
                    id: item.menuItemId,
                    restaurantId,
                    status: 'AVAILABLE',
                },
            })

            if (!menuItem) {
                throw new BadRequestException(
                    `Menu item ${item.menuItemId} not available`
                )
            }

            const itemPrice = Number(menuItem.basePrice)
            let modifiersPrice = 0
            const modifiers: Prisma.OrderItemModifierCreateWithoutOrderItemInput[] =
                []

            if (item.modifiers) {
                for (const mod of item.modifiers) {
                    modifiers.push({
                        modifierOption: mod.modifierOptionId
                            ? { connect: { id: mod.modifierOptionId } }
                            : undefined,
                        modifierName: mod.modifierName,
                        priceAdjustment: mod.priceAdjustment,
                    })
                    modifiersPrice += mod.priceAdjustment
                }
            }

            const lineTotal = (itemPrice + modifiersPrice) * item.quantity
            totalAmount += lineTotal

            orderItems.push({
                menuItem: { connect: { id: item.menuItemId } },
                name: menuItem.name,
                quantity: item.quantity,
                pricePerUnit: itemPrice + modifiersPrice,
                status: OrderItemStatus.QUEUED,
                note: item.note,
                modifiers: {
                    create: modifiers,
                },
            })
        }

        // Create order with items
        const order = await this.prisma.order.create({
            data: {
                restaurantId,
                tableId,
                userId,
                guestCount: guestCount || 1,
                note,
                totalAmount,
                status: OrderStatus.PENDING,
                items: {
                    create: orderItems,
                },
            },
            include: {
                table: true,
                items: {
                    include: {
                        modifiers: true,
                    },
                },
            },
        })

        // Update table status to OCCUPIED
        await this.prisma.table.update({
            where: { id: tableId },
            data: { status: TableStatus.OCCUPIED },
        })

        // Emit real-time event
        const orderSummary = this.mapToOrderSummary(order)
        const event: OrderCreatedEvent = {
            order: orderSummary,
            tableId,
            restaurantId,
        }
        this.socketService.emitOrderCreated(restaurantId, event)

        this.logger.log(`Order ${order.id} created for table ${table.name}`)

        return order
    }

    /**
     * Add items to existing order
     */
    async addItemsToOrder(orderId: number, addItemsDto: AddItemsToOrderDto) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { table: true },
        })

        if (!order) {
            throw new NotFoundException('Order not found')
        }

        // Can only add items to pending or in-progress orders
        if (
            order.status === OrderStatus.COMPLETED ||
            order.status === OrderStatus.CANCELLED
        ) {
            throw new BadRequestException('Cannot add items to this order')
        }

        let additionalAmount = 0
        const newItems: Prisma.OrderItemCreateManyInput[] = []

        for (const item of addItemsDto.items) {
            const menuItem = await this.prisma.menuItem.findFirst({
                where: {
                    id: item.menuItemId,
                    restaurantId: order.restaurantId,
                    status: 'AVAILABLE',
                },
            })

            if (!menuItem) {
                throw new BadRequestException(
                    `Menu item ${item.menuItemId} not available`
                )
            }

            const itemPrice = Number(menuItem.basePrice)
            let modifiersPrice = 0

            if (item.modifiers) {
                modifiersPrice = item.modifiers.reduce(
                    (sum, m) => sum + m.priceAdjustment,
                    0
                )
            }

            const lineTotal = (itemPrice + modifiersPrice) * item.quantity
            additionalAmount += lineTotal
        }

        // Create new items
        for (const item of addItemsDto.items) {
            const menuItem = await this.prisma.menuItem.findUnique({
                where: { id: item.menuItemId },
            })

            const itemPrice = Number(menuItem!.basePrice)
            let modifiersPrice = 0

            if (item.modifiers) {
                modifiersPrice = item.modifiers.reduce(
                    (sum, m) => sum + m.priceAdjustment,
                    0
                )
            }

            const orderItem = await this.prisma.orderItem.create({
                data: {
                    orderId,
                    menuItemId: item.menuItemId,
                    name: menuItem!.name,
                    quantity: item.quantity,
                    pricePerUnit: itemPrice + modifiersPrice,
                    status: OrderItemStatus.QUEUED,
                    note: item.note,
                    modifiers: item.modifiers
                        ? {
                              create: item.modifiers.map((m) => ({
                                  modifierOptionId: m.modifierOptionId,
                                  modifierName: m.modifierName,
                                  priceAdjustment: m.priceAdjustment,
                              })),
                          }
                        : undefined,
                },
            })
        }

        // Update total amount
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                totalAmount: {
                    increment: additionalAmount,
                },
            },
            include: {
                table: true,
                items: {
                    include: {
                        modifiers: true,
                    },
                },
            },
        })

        // Emit real-time event
        const orderSummary = this.mapToOrderSummary(updatedOrder)
        const event: OrderUpdatedEvent = {
            order: orderSummary,
            updatedFields: ['items', 'totalAmount'],
        }
        this.socketService.emitOrderItemsAdded(
            order.restaurantId,
            order.tableId,
            event
        )

        this.logger.log(`Items added to order ${orderId}`)

        return updatedOrder
    }

    /**
     * Find all orders with filters
     */
    async findAll(filters: {
        restaurantId?: number
        tableId?: number
        waiterId?: number
        status?: OrderStatus | OrderStatus[]
        fromDate?: Date
        toDate?: Date
        page?: number
        pageSize?: number
    }) {
        const {
            restaurantId,
            tableId,
            waiterId,
            status,
            fromDate,
            toDate,
            page = 1,
            pageSize = 20,
        } = filters

        const where: Prisma.OrderWhereInput = {}

        if (restaurantId) where.restaurantId = restaurantId
        if (tableId) where.tableId = tableId
        if (waiterId) where.waiterId = waiterId
        if (status) {
            where.status = Array.isArray(status) ? { in: status } : status
        }
        if (fromDate || toDate) {
            where.createdAt = {}
            if (fromDate) where.createdAt.gte = fromDate
            if (toDate) where.createdAt.lte = toDate
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    table: true,
                    waiter: { select: { id: true, fullName: true } },
                    items: {
                        include: {
                            modifiers: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.order.count({ where }),
        ])

        return {
            orders,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        }
    }

    /**
     * Find one order by ID
     */
    async findOne(id: number) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                table: true,
                customer: { select: { id: true, fullName: true, email: true } },
                waiter: { select: { id: true, fullName: true } },
                items: {
                    include: {
                        modifiers: true,
                        menuItem: true,
                    },
                },
                payment: true,
            },
        })

        if (!order) {
            throw new NotFoundException('Order not found')
        }

        return order
    }

    /**
     * Update order
     */
    async update(id: number, updateOrderDto: UpdateOrderDto) {
        const order = await this.findOne(id)

        // Validate status transition if status is being updated
        if (
            updateOrderDto.status &&
            !canTransitionOrderStatus(
                order.status as unknown as SharedOrderStatus,
                updateOrderDto.status as unknown as SharedOrderStatus
            )
        ) {
            throw new BadRequestException(
                `Cannot transition from ${order.status} to ${updateOrderDto.status}`
            )
        }

        const previousStatus = order.status
        const updatedOrder = await this.prisma.order.update({
            where: { id },
            data: updateOrderDto,
            include: {
                table: true,
                items: {
                    include: {
                        modifiers: true,
                    },
                },
            },
        })

        // Emit status change if status was updated
        if (updateOrderDto.status && updateOrderDto.status !== previousStatus) {
            const event: OrderStatusChangedEvent = {
                orderId: id,
                previousStatus,
                newStatus: updateOrderDto.status,
                updatedAt: new Date().toISOString(),
            }
            this.socketService.emitOrderStatusChanged(
                order.restaurantId,
                order.tableId,
                event
            )

            // If order completed, update table status
            if (updateOrderDto.status === OrderStatus.COMPLETED) {
                await this.prisma.table.update({
                    where: { id: order.tableId },
                    data: { status: TableStatus.AVAILABLE },
                })
            }
        }

        return updatedOrder
    }

    /**
     * Cancel order
     */
    async cancel(id: number, reason?: string) {
        const order = await this.findOne(id)

        if (
            order.status === OrderStatus.COMPLETED ||
            order.status === OrderStatus.CANCELLED
        ) {
            throw new BadRequestException('Cannot cancel this order')
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id },
            data: {
                status: OrderStatus.CANCELLED,
                note: reason
                    ? `${order.note || ''} [Cancelled: ${reason}]`
                    : order.note,
            },
        })

        // Cancel all queued/preparing items
        await this.prisma.orderItem.updateMany({
            where: {
                orderId: id,
                status: {
                    in: [OrderItemStatus.QUEUED, OrderItemStatus.PREPARING],
                },
            },
            data: { status: OrderItemStatus.CANCELLED },
        })

        // Update table status
        await this.prisma.table.update({
            where: { id: order.tableId },
            data: { status: TableStatus.AVAILABLE },
        })

        // Emit events
        const event: OrderStatusChangedEvent = {
            orderId: id,
            previousStatus: order.status,
            newStatus: OrderStatus.CANCELLED,
            updatedAt: new Date().toISOString(),
        }
        this.socketService.emitOrderStatusChanged(
            order.restaurantId,
            order.tableId,
            event
        )

        return updatedOrder
    }

    // ========================================================================
    // WAITER OPERATIONS
    // ========================================================================

    /**
     * Get pending orders for waiter
     */
    async getPendingOrders(restaurantId: number) {
        return this.prisma.order.findMany({
            where: {
                restaurantId,
                status: OrderStatus.PENDING,
            },
            include: {
                table: true,
                items: {
                    include: {
                        modifiers: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        })
    }

    /**
     * Assign waiter to order
     */
    async assignWaiter(orderId: number, assignDto: AssignWaiterDto) {
        const order = await this.findOne(orderId)
        const waiter = await this.prisma.user.findFirst({
            where: { id: assignDto.waiterId, role: 'WAITER' },
        })

        if (!waiter) {
            throw new NotFoundException('Waiter not found')
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { waiterId: assignDto.waiterId },
            include: { table: true },
        })

        this.socketService.emitWaiterAssigned(
            order.restaurantId,
            order.tableId,
            orderId,
            waiter.id,
            waiter.fullName
        )

        return updatedOrder
    }

    /**
     * Check if table has existing active order
     */
    async checkTableActiveOrder(tableId: number, restaurantId: number) {
        const activeOrder = await this.prisma.order.findFirst({
            where: {
                tableId,
                restaurantId,
                status: OrderStatus.IN_PROGRESS,
            },
            include: {
                table: true,
                items: {
                    include: {
                        modifiers: true,
                    },
                },
            },
        })

        this.logger.log(
            `Checking table ${tableId} in restaurant ${restaurantId}: ${activeOrder ? `Found order #${activeOrder.id}` : 'No active order'}`
        )

        return activeOrder
    }

    /**
     * Accept order (by waiter)
     * If mergeWithOrderId is provided, merge items into existing order
     */
    async acceptOrder(orderId: number, waiterId: number, mergeWithOrderId?: number) {
        // Get full order details with items
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                table: true,
                items: {
                    include: {
                        modifiers: true,
                    },
                },
            },
        })

        if (!order) {
            throw new NotFoundException('Order not found')
        }

        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException('Order is not pending')
        }

        // Check if table has existing active order
        const existingOrder = await this.checkTableActiveOrder(order.tableId, order.restaurantId)

        // If table has active order and no merge confirmation, return info for confirmation
        if (existingOrder && !mergeWithOrderId) {
            this.logger.log(
                `Order ${orderId} needs confirmation - Table ${order.tableId} (restaurant ${order.restaurantId}) has active order #${existingOrder.id}`
            )
            return {
                needsConfirmation: true,
                existingOrder: {
                    id: existingOrder.id,
                    tableName: existingOrder.table.name,
                    totalAmount: Number(existingOrder.totalAmount),
                    itemCount: existingOrder.items.length,
                },
                newOrder: {
                    id: order.id,
                    itemCount: order.items.length,
                },
            }
        }

        // If merging, add items to existing order and cancel new order
        if (mergeWithOrderId) {
            const targetOrder = await this.prisma.order.findUnique({
                where: { id: mergeWithOrderId },
                include: { items: true },
            })

            if (!targetOrder) {
                throw new NotFoundException('Target order not found')
            }

            // Get items from pending order
            const pendingOrderItems = await this.prisma.orderItem.findMany({
                where: { orderId },
                include: { modifiers: true },
            })

            // Add items to existing order with QUEUED status
            for (const item of pendingOrderItems) {
                await this.prisma.orderItem.create({
                    data: {
                        orderId: mergeWithOrderId,
                        menuItemId: item.menuItemId,
                        name: item.name,
                        quantity: item.quantity,
                        pricePerUnit: item.pricePerUnit,
                        status: OrderItemStatus.QUEUED,
                        note: item.note,
                        modifiers: {
                            create: item.modifiers.map((mod) => ({
                                modifierOptionId: mod.modifierOptionId,
                                modifierName: mod.modifierName,
                                priceAdjustment: mod.priceAdjustment,
                            })),
                        },
                    },
                })
            }

            // Update total amount of existing order
            const updatedOrder = await this.prisma.order.update({
                where: { id: mergeWithOrderId },
                data: {
                    totalAmount: {
                        increment: order.totalAmount,
                    },
                },
                include: {
                    table: true,
                    items: {
                        include: {
                            modifiers: true,
                        },
                    },
                },
            })

            // Cancel the pending order
            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.CANCELLED,
                    note: `Merged into order #${mergeWithOrderId}`,
                },
            })

            // Send only NEW items to kitchen (not the merged order)
            for (const item of pendingOrderItems) {
                const newItem = updatedOrder.items.find(
                    (i) => i.name === item.name && i.status === OrderItemStatus.QUEUED
                )
                if (newItem) {
                    // Emit item status change for kitchen
                    const itemStatusEvent: OrderItemStatusChangedEvent = {
                        orderId: mergeWithOrderId,
                        orderItemId: newItem.id,
                        itemName: newItem.name,
                        previousStatus: OrderItemStatus.QUEUED,
                        newStatus: OrderItemStatus.QUEUED,
                        updatedAt: new Date().toISOString(),
                    }
                    this.socketService.emitOrderItemStatusChanged(
                        order.restaurantId,
                        order.tableId,
                        itemStatusEvent
                    )
                }
            }

            // Send to kitchen - only the new items
            const kitchenView = this.mapToKitchenOrderView(updatedOrder)
            // Filter to only show new QUEUED items
            kitchenView.items = kitchenView.items.filter(
                (item) => item.status === SharedOrderItemStatus.QUEUED
            )
            const kitchenEvent: KitchenOrderEvent = {
                order: kitchenView,
                priority: 'normal',
            }
            this.socketService.emitKitchenOrderReceived(
                order.restaurantId,
                kitchenEvent
            )

            this.logger.log(
                `Order ${orderId} merged into order ${mergeWithOrderId} by waiter ${waiterId}`
            )

            return {
                merged: true,
                targetOrder: updatedOrder,
            }
        }

        // Normal accept flow (no existing order on table)
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.IN_PROGRESS,
                waiterId,
            },
            include: {
                table: true,
                items: {
                    include: {
                        modifiers: true,
                    },
                },
            },
        })

        // Emit accepted event
        this.socketService.emitOrderAccepted(
            order.restaurantId,
            order.tableId,
            orderId,
            waiterId
        )

        // Send to kitchen
        const kitchenView = this.mapToKitchenOrderView(updatedOrder)
        const kitchenEvent: KitchenOrderEvent = {
            order: kitchenView,
            priority: 'normal',
        }
        this.socketService.emitKitchenOrderReceived(
            order.restaurantId,
            kitchenEvent
        )

        // Emit status change
        const statusEvent: OrderStatusChangedEvent = {
            orderId,
            previousStatus: OrderStatus.PENDING,
            newStatus: OrderStatus.IN_PROGRESS,
            updatedAt: new Date().toISOString(),
            updatedBy: waiterId,
        }
        this.socketService.emitOrderStatusChanged(
            order.restaurantId,
            order.tableId,
            statusEvent
        )

        this.logger.log(`Order ${orderId} accepted by waiter ${waiterId}`)

        return updatedOrder
    }

    /**
     * Reject order (by waiter)
     */
    async rejectOrder(orderId: number, waiterId: number, reason?: string) {
        const order = await this.findOne(orderId)

        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException('Order is not pending')
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.CANCELLED,
                note: reason
                    ? `${order.note || ''} [Rejected: ${reason}]`
                    : order.note,
            },
        })

        // Cancel all items
        await this.prisma.orderItem.updateMany({
            where: { orderId },
            data: { status: OrderItemStatus.CANCELLED },
        })

        // Update table status
        await this.prisma.table.update({
            where: { id: order.tableId },
            data: { status: TableStatus.AVAILABLE },
        })

        // Emit rejected event
        this.socketService.emitOrderRejected(
            order.restaurantId,
            order.tableId,
            orderId,
            reason
        )

        this.logger.log(`Order ${orderId} rejected by waiter ${waiterId}`)

        return updatedOrder
    }

    /**
     * Mark order as served
     */
    async markOrderServed(orderId: number) {
        const order = await this.findOne(orderId)

        // Check all items are ready or served
        const allReady = order.items.every(
            (item) =>
                item.status === OrderItemStatus.READY ||
                item.status === OrderItemStatus.SERVED
        )

        if (!allReady) {
            throw new BadRequestException('Not all items are ready')
        }

        // Get items that will be changed
        const readyItems = order.items.filter(
            (item) => item.status === OrderItemStatus.READY
        )

        // Update all ready items to served
        await this.prisma.orderItem.updateMany({
            where: {
                orderId,
                status: OrderItemStatus.READY,
            },
            data: { status: OrderItemStatus.SERVED },
        })

        // Emit item status changes for each item (for real-time sync)
        for (const item of readyItems) {
            const event: OrderItemStatusChangedEvent = {
                orderId,
                orderItemId: item.id,
                itemName: item.name,
                previousStatus: OrderItemStatus.READY,
                newStatus: OrderItemStatus.SERVED,
                updatedAt: new Date().toISOString(),
            }
            this.socketService.emitOrderItemStatusChanged(
                order.restaurantId,
                order.tableId,
                event
            )
        }

        this.socketService.emitOrderServed(
            order.restaurantId,
            order.tableId,
            orderId
        )

        this.logger.log(`Order ${orderId} marked as served`)

        return this.findOne(orderId)
    }

    /**
     * Process cash payment for order
     */
    async processCashPayment(orderId: number) {
        const order = await this.findOne(orderId)

        if (order.status === OrderStatus.COMPLETED) {
            throw new BadRequestException('Order is already completed')
        }

        if (order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException('Cannot pay for cancelled order')
        }

        // Update order status to COMPLETED
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.COMPLETED,
            },
            include: {
                table: true,
                items: true,
            },
        })

        // Create payment record
        await this.prisma.payment.create({
            data: {
                orderId,
                amount: order.totalAmount,
                method: 'CASH',
                status: 'SUCCESS',
            },
        })

        // Reset table status to AVAILABLE
        await this.prisma.table.update({
            where: { id: order.tableId },
            data: { status: TableStatus.AVAILABLE },
        })

        // Emit order completed event
        const statusEvent: OrderStatusChangedEvent = {
            orderId,
            previousStatus: order.status,
            newStatus: OrderStatus.COMPLETED,
            updatedAt: new Date().toISOString(),
        }
        this.socketService.emitOrderStatusChanged(
            order.restaurantId,
            order.tableId,
            statusEvent
        )

        this.logger.log(`Order ${orderId} paid with cash and completed`)

        return updatedOrder
    }

    // ========================================================================
    // KITCHEN OPERATIONS
    // ========================================================================

    /**
     * Get orders for Kitchen Display System
     */
    async getKitchenOrders(restaurantId: number) {
        const orders = await this.prisma.order.findMany({
            where: {
                restaurantId,
                status: OrderStatus.IN_PROGRESS,
                items: {
                    some: {
                        status: {
                            in: [
                                OrderItemStatus.QUEUED,
                                OrderItemStatus.PREPARING,
                            ],
                        },
                    },
                },
            },
            include: {
                table: true,
                items: {
                    where: {
                        status: {
                            in: [
                                OrderItemStatus.QUEUED,
                                OrderItemStatus.PREPARING,
                                OrderItemStatus.READY,
                            ],
                        },
                    },
                    include: {
                        modifiers: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        return orders.map((order) => this.mapToKitchenOrderView(order))
    }

    /**
     * Update order item status (Kitchen)
     */
    async updateOrderItemStatus(
        orderItemId: number,
        updateDto: UpdateOrderItemStatusDto
    ) {
        const orderItem = await this.prisma.orderItem.findUnique({
            where: { id: orderItemId },
            include: {
                order: {
                    include: { table: true },
                },
            },
        })

        if (!orderItem) {
            throw new NotFoundException('Order item not found')
        }

        // Validate status transition
        if (
            !canTransitionOrderItemStatus(
                orderItem.status as unknown as SharedOrderItemStatus,
                updateDto.status as unknown as SharedOrderItemStatus
            )
        ) {
            throw new BadRequestException(
                `Cannot transition from ${orderItem.status} to ${updateDto.status}`
            )
        }

        const previousStatus = orderItem.status
        const updatedItem = await this.prisma.orderItem.update({
            where: { id: orderItemId },
            data: { status: updateDto.status },
            include: {
                modifiers: true,
            },
        })

        // Emit item status change
        const event: OrderItemStatusChangedEvent = {
            orderId: orderItem.orderId,
            orderItemId,
            itemName: orderItem.name,
            previousStatus,
            newStatus: updateDto.status,
            updatedAt: new Date().toISOString(),
        }
        this.socketService.emitOrderItemStatusChanged(
            orderItem.order.restaurantId,
            orderItem.order.tableId,
            event
        )

        // If item is ready, send special notification
        if (updateDto.status === OrderItemStatus.READY) {
            this.socketService.emitOrderItemReady(
                orderItem.order.restaurantId,
                orderItem.order.tableId,
                event
            )

            // Check if all items are ready
            const allItems = await this.prisma.orderItem.findMany({
                where: { orderId: orderItem.orderId },
            })

            const allReady = allItems.every(
                (item) =>
                    item.status === OrderItemStatus.READY ||
                    item.status === OrderItemStatus.SERVED ||
                    item.status === OrderItemStatus.CANCELLED
            )

            if (allReady) {
                this.socketService.emitKitchenOrderReady(
                    orderItem.order.restaurantId,
                    orderItem.orderId,
                    orderItem.order.table.name
                )
            }
        }

        this.logger.log(
            `Order item ${orderItemId} status: ${previousStatus} -> ${updateDto.status}`
        )

        return updatedItem
    }

    /**
     * Start preparing an item (Kitchen)
     */
    async startPreparingItem(orderItemId: number) {
        return this.updateOrderItemStatus(orderItemId, {
            status: OrderItemStatus.PREPARING,
        })
    }

    /**
     * Mark item as ready (Kitchen)
     */
    async markItemReady(orderItemId: number) {
        return this.updateOrderItemStatus(orderItemId, {
            status: OrderItemStatus.READY,
        })
    }

    // ========================================================================
    // BILL OPERATIONS
    // ========================================================================

    /**
     * Request bill for order
     */
    async requestBill(orderId: number) {
        const order = await this.findOne(orderId)

        if (
            order.status === OrderStatus.CANCELLED ||
            order.status === OrderStatus.PENDING
        ) {
            throw new BadRequestException('Cannot request bill for this order')
        }

        this.socketService.emitBillRequested(
            order.restaurantId,
            orderId,
            order.tableId,
            order.table.name
        )

        return {
            orderId,
            tableId: order.tableId,
            tableName: order.table.name,
            totalAmount: order.totalAmount,
            items: order.items,
        }
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private mapToOrderSummary(order: any): OrderSummary {
        return {
            id: order.id,
            tableId: order.tableId,
            tableName: order.table?.name || '',
            status: order.status,
            totalAmount: Number(order.totalAmount),
            guestCount: order.guestCount,
            note: order.note,
            waiterName: order.waiter?.fullName,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
            items: order.items.map(
                (item: any): OrderItemSummary => ({
                    id: item.id,
                    menuItemId: item.menuItemId,
                    name: item.name,
                    quantity: item.quantity,
                    pricePerUnit: Number(item.pricePerUnit),
                    status: item.status,
                    note: item.note,
                    createdAt: item.createdAt.toISOString(),
                    modifiers:
                        item.modifiers?.map((m: any) => ({
                            id: m.id,
                            name: m.modifierName,
                            priceAdjustment: Number(m.priceAdjustment),
                        })) || [],
                })
            ),
        }
    }

    private mapToKitchenOrderView(order: any): KitchenOrderView {
        const createdAt =
            order.createdAt instanceof Date
                ? order.createdAt
                : new Date(order.createdAt)
        const now = new Date()
        const elapsedMinutes = Math.floor(
            (now.getTime() - createdAt.getTime()) / 60000
        )

        return {
            id: order.id,
            tableName: order.table?.name || '',
            note: order.note,
            createdAt: createdAt.toISOString(),
            elapsedMinutes,
            isOverdue: elapsedMinutes > 30, // Orders older than 30 min are overdue
            items: order.items.map((item: any): KitchenItemView => {
                const itemUpdatedAt =
                    item.updatedAt instanceof Date
                        ? item.updatedAt
                        : item.updatedAt
                          ? new Date(item.updatedAt)
                          : null
                return {
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    status: item.status,
                    note: item.note,
                    modifiers:
                        item.modifiers?.map((m: any) => m.modifierName) || [],
                    prepTimeMinutes: 15, // Default prep time
                    startedAt:
                        item.status === OrderItemStatus.PREPARING &&
                        itemUpdatedAt
                            ? itemUpdatedAt.toISOString()
                            : undefined,
                    isOverdue: false,
                }
            }),
        }
    }

    // ========================================================================
    // STRIPE PAYMENT METHODS
    // ========================================================================

    /**
     * Create Stripe checkout session for an order
     */
    async createCheckoutSession(
        orderId: number,
        successUrl: string,
        cancelUrl: string
    ) {
        // Re-check Stripe configuration at runtime
        if (!this.stripe) {
            const stripeSecretKey =
                this.configService.get<string>('stripe.secretKey') ||
                this.configService.get<string>('STRIPE_SECRET_KEY') ||
                process.env.STRIPE_SECRET_KEY

            if (stripeSecretKey && stripeSecretKey.trim().length > 0) {
                try {
                    this.stripe = new Stripe(stripeSecretKey.trim(), {
                        apiVersion:
                            '2025-12-15.clover' as Stripe.LatestApiVersion,
                    })
                } catch (error) {
                    this.logger.error(
                        'Failed to initialize Stripe client:',
                        error
                    )
                    throw new BadRequestException(
                        `Stripe is not configured. Failed to initialize with provided key. ` +
                            `Please verify STRIPE_SECRET_KEY in .env file and restart the server.`
                    )
                }
            } else {
                throw new BadRequestException(
                    'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables (.env file) and restart the server.'
                )
            }
        }

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                payment: true,
            },
        })

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found`)
        }

        if (order.payment?.status === 'SUCCESS') {
            throw new BadRequestException('Order has already been paid')
        }

        // Create Stripe checkout session
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: order.items.map((item: any) => ({
                price_data: {
                    currency: 'vnd',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.round(Number(item.pricePerUnit) * 100), // Convert to cents (VND)
                },
                quantity: item.quantity,
            })),
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                orderId: orderId.toString(),
            },
        })

        return {
            sessionId: session.id,
            url: session.url,
        }
    }

    /**
     * Handle Stripe webhook events
     */
    async handleStripeWebhook(signature: string, body: Buffer) {
        if (!this.stripe) {
            throw new BadRequestException('Stripe is not configured')
        }

        const webhookSecret = this.configService.get<string>(
            'stripe.webhookSecret'
        )
        if (!webhookSecret) {
            throw new BadRequestException(
                'Stripe webhook secret is not configured'
            )
        }

        let event: Stripe.Event

        try {
            event = this.stripe.webhooks.constructEvent(
                body,
                signature,
                webhookSecret
            )
        } catch (err: any) {
            throw new BadRequestException(
                `Webhook signature verification failed: ${err.message}`
            )
        }

        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session
            const orderId = parseInt(session.metadata?.orderId || '0', 10)

            if (orderId) {
                await this.prisma.payment.update({
                    where: { orderId },
                    data: {
                        status: 'SUCCESS',
                    },
                })

                this.logger.log(`Payment successful for order ${orderId}`)
            }
        }

        return { received: true }
    }
}
