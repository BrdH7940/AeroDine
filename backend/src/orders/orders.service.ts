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
import { randomUUID } from 'crypto'
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
    NotificationEvent,
    TableStatusEvent,
    MenuItemStatusChangedEvent,
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
    async create(createOrderDto: CreateOrderDto, guestSessionId?: string) {
        const { restaurantId, tableId, userId, guestCount, note, items } =
            createOrderDto

        // Generate guest session ID if user is not authenticated
        const sessionId = userId ? undefined : (guestSessionId || randomUUID())

        // Verify table exists and belongs to restaurant
        const table = await this.prisma.table.findFirst({
            where: { id: tableId, restaurantId, isActive: true },
        })

        if (!table) {
            throw new NotFoundException('Table not found')
        }

        // Case: Table Conflict Detection - Prevent wrong table ID usage
        // Check if table has active orders (not COMPLETED or CANCELLED) created within the last 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
        const recentActiveOrders = await this.prisma.order.findMany({
            where: {
                tableId,
                restaurantId,
                status: {
                    notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
                },
                createdAt: {
                    gte: twoHoursAgo,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 1, // Only need the most recent one
        })

        // If there's a recent active order, check if it's from a different user
        if (recentActiveOrders.length > 0) {
            const existingOrder = recentActiveOrders[0]
            
            // Check if the new order is from a different user
            const isDifferentUser = 
                (userId && existingOrder.userId && userId !== existingOrder.userId) ||
                (userId && !existingOrder.userId) ||
                (!userId && existingOrder.userId)

            if (isDifferentUser) {
                throw new BadRequestException(
                    `Table ${table.name} is already processing an order from a different customer. Please check your table number. If you are sitting at the correct table ${table.name}, please contact the staff for assistance.`
                )
            }

            // For guest-to-guest conflicts: check if there's a very recent guest order (within 30 minutes)
            // This helps catch cases where someone at a different table accidentally uses the wrong table ID
            if (!userId && !existingOrder.userId) {
                const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
                if (existingOrder.createdAt >= thirtyMinutesAgo) {
                    throw new BadRequestException(
                        `Table ${table.name} just had an order created recently. Please check your table number to ensure you are entering the correct table number. If you are sure you are sitting at the correct table ${table.name}, please contact the staff for assistance.`
                    )
                }
            }
        }

        // Case 3: Limit Active Orders - Prevent spam orders
        // Check if table has 5 or more active orders (not COMPLETED or CANCELLED)
        // Allow up to 5 active orders per table
        const activeOrderCount = await this.prisma.order.count({
            where: {
                tableId,
                restaurantId,
                status: {
                    notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
                },
            },
        })

        if (activeOrderCount >= 5) {
            throw new BadRequestException(
                `Table ${table.name} already has ${activeOrderCount} active orders (maximum 5 allowed). Please wait for some orders to be completed or cancelled before placing a new order.`
            )
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

            // Check stock quantity if item has stock tracking (stockQuantity is not null)
            if (menuItem.stockQuantity !== null) {
                if (menuItem.stockQuantity < item.quantity) {
                    throw new BadRequestException(
                        `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stockQuantity}, Requested: ${item.quantity}`
                    )
                }
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

        // Case 1: Ghost Order Prevention - Set status to PENDING_REVIEW
        // Order requires waiter confirmation before going to kitchen
        const order = await this.prisma.order.create({
            data: {
                restaurantId,
                tableId,
                userId,
                guestSessionId: sessionId, // Store guest session ID for tracking
                guestCount: guestCount || 1,
                note,
                totalAmount,
                status: 'PENDING_REVIEW' as any, // Use string literal - Prisma client will be regenerated after migration
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

        // Get current table status before update
        const currentTable = await this.prisma.table.findUnique({
            where: { id: tableId },
        })
        const previousTableStatus = currentTable?.status || TableStatus.AVAILABLE

        // Update table status to OCCUPIED
        await this.prisma.table.update({
            where: { id: tableId },
            data: { status: TableStatus.OCCUPIED },
        })

        // Emit table status change
        if (previousTableStatus !== TableStatus.OCCUPIED) {
            const tableStatusEvent: TableStatusEvent = {
                tableId,
                previousStatus: previousTableStatus,
                newStatus: TableStatus.OCCUPIED,
                orderId: order.id,
            }
            this.socketService.emitTableStatusChanged(restaurantId, tableStatusEvent)
        }

        // Emit real-time event
        const orderSummary = this.mapToOrderSummary(order)
        const event: OrderCreatedEvent = {
            order: orderSummary,
            tableId,
            restaurantId,
        }
        this.socketService.emitOrderCreated(restaurantId, event)

        this.logger.log(`Order ${order.id} created for table ${table.name}${sessionId ? ` (guest session: ${sessionId})` : ''}`)

        // Return order with guestSessionId for client to store
        return {
            ...order,
            guestSessionId: sessionId,
        }
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
     * Get orders by table for customer (with userId and payment status filtering)
     * - If userId provided (logged in): show only their unpaid/uncompleted orders at table
     * - If userId is null (guest): show orders matching guestSessionId
     */
    async getOrdersByTableForCustomer(tableId: number, userId?: number, guestSessionId?: string) {
        const where: Prisma.OrderWhereInput = {
            tableId,
            // Show only orders that are not completed
            status: {
                notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
            },
            // Exclude orders with successful payment (payment.status = SUCCESS)
            // Include orders with no payment record OR payment status != SUCCESS
            OR: [
                { payment: null }, // No payment record yet
                { payment: { status: { not: 'SUCCESS' } } }, // Payment exists but not successful
            ],
        }

        // Filter by userId if logged in, or by guestSessionId if guest
        if (userId) {
            where.userId = userId
        } else if (guestSessionId) {
            where.guestSessionId = guestSessionId
        }

        const orders = await this.prisma.order.findMany({
            where,
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
            orderBy: { createdAt: 'desc' },
        })

        return {
            orders,
            total: orders.length,
        }
    }

    /**
     * Get orders by guest session ID (for guest order tracking)
     * Returns all orders (including completed) for the guest session
     */
    async getOrdersByGuestSession(guestSessionId: string) {
        const orders = await this.prisma.order.findMany({
            where: {
                guestSessionId,
            },
            include: {
                table: true,
                items: {
                    include: {
                        modifiers: true,
                        menuItem: true,
                    },
                },
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return {
            orders,
            total: orders.length,
        }
    }

    /**
     * Find all orders with filters
     */
    async findAll(filters: {
        restaurantId?: number
        tableId?: number
        waiterId?: number
        customerId?: number
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
            customerId,
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
        if (customerId) where.userId = customerId
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
                    payment: true,
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

            // If order completed, check if table has other active orders
            if (updateOrderDto.status === OrderStatus.COMPLETED) {
                const hasOtherActiveOrders = await this.hasActiveOrdersOnTable(
                    order.tableId,
                    order.restaurantId,
                    id
                )

                // Only reset table status if no other active orders
                if (!hasOtherActiveOrders) {
                    const currentTable = await this.prisma.table.findUnique({
                        where: { id: order.tableId },
                    })
                    const previousTableStatus = currentTable?.status || TableStatus.OCCUPIED

                    await this.prisma.table.update({
                        where: { id: order.tableId },
                        data: { status: TableStatus.AVAILABLE },
                    })

                    // Emit table status change
                    if (previousTableStatus !== TableStatus.AVAILABLE) {
                        const tableStatusEvent: TableStatusEvent = {
                            tableId: order.tableId,
                            previousStatus: previousTableStatus,
                            newStatus: TableStatus.AVAILABLE,
                            orderId: id,
                        }
                        this.socketService.emitTableStatusChanged(
                            order.restaurantId,
                            tableStatusEvent
                        )
                    }
                }
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

        // Check if table has other active orders before setting AVAILABLE
        const hasOtherActiveOrders = await this.hasActiveOrdersOnTable(
            order.tableId,
            order.restaurantId,
            id
        )

        // Only reset table status if no other active orders
        if (!hasOtherActiveOrders) {
            const currentTable = await this.prisma.table.findUnique({
                where: { id: order.tableId },
            })
            const previousTableStatus = currentTable?.status || TableStatus.OCCUPIED

            await this.prisma.table.update({
                where: { id: order.tableId },
                data: { status: TableStatus.AVAILABLE },
            })

            // Emit table status change
            if (previousTableStatus !== TableStatus.AVAILABLE) {
                const tableStatusEvent: TableStatusEvent = {
                    tableId: order.tableId,
                    previousStatus: previousTableStatus,
                    newStatus: TableStatus.AVAILABLE,
                    orderId: id,
                }
                this.socketService.emitTableStatusChanged(
                    order.restaurantId,
                    tableStatusEvent
                )
            }
        }

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
     * Get pending orders for waiter (including PENDING_REVIEW orders requiring confirmation)
     */
    async getPendingOrders(restaurantId: number) {
        return this.prisma.order.findMany({
            where: {
                restaurantId,
                status: {
                    in: ['PENDING_REVIEW', 'PENDING'] as any,
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

        // Accept both PENDING_REVIEW and PENDING orders
        // Convert to string for comparison (Prisma enum might be string)
        const orderStatus = String(order.status)
        if (orderStatus !== 'PENDING_REVIEW' && orderStatus !== 'PENDING') {
            throw new BadRequestException(
                `Cannot accept order with status ${orderStatus}. Order must be PENDING_REVIEW or PENDING.`
            )
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
                status: 'IN_PROGRESS' as any, // Use string literal - Prisma client will be regenerated after migration
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
            previousStatus: String(order.status) as SharedOrderStatus,
            newStatus: 'IN_PROGRESS' as SharedOrderStatus,
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
     * Can reject PENDING_REVIEW orders (if table is empty/ghost order)
     */
    async rejectOrder(orderId: number, waiterId: number, reason?: string) {
        const order = await this.findOne(orderId)

        // Can reject both PENDING_REVIEW and PENDING orders
        // Convert to string for comparison (Prisma enum might be string)
        const orderStatus = String(order.status)
        if (orderStatus !== 'PENDING_REVIEW' && orderStatus !== 'PENDING') {
            throw new BadRequestException(
                `Cannot reject order with status ${orderStatus}. Order must be PENDING_REVIEW or PENDING.`
            )
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

        // Check if table has other active orders before setting AVAILABLE
        const hasOtherActiveOrders = await this.hasActiveOrdersOnTable(
            order.tableId,
            order.restaurantId,
            orderId
        )

        // Only reset table status if no other active orders
        if (!hasOtherActiveOrders) {
            const currentTable = await this.prisma.table.findUnique({
                where: { id: order.tableId },
            })
            const previousTableStatus = currentTable?.status || TableStatus.OCCUPIED

            await this.prisma.table.update({
                where: { id: order.tableId },
                data: { status: TableStatus.AVAILABLE },
            })

            // Emit table status change
            if (previousTableStatus !== TableStatus.AVAILABLE) {
                const tableStatusEvent: TableStatusEvent = {
                    tableId: order.tableId,
                    previousStatus: previousTableStatus,
                    newStatus: TableStatus.AVAILABLE,
                    orderId,
                }
                this.socketService.emitTableStatusChanged(
                    order.restaurantId,
                    tableStatusEvent
                )
            }
        }

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

        // Check if payment already exists
        if (order.payment) {
            if (order.payment.status === 'SUCCESS') {
                throw new BadRequestException(
                    'Order has already been paid successfully'
                )
            }
            // If payment exists but status is not SUCCESS, update it
            // This handles cases where payment was created but not completed
        }

        // Use transaction to ensure atomicity
        // All operations must succeed or all must fail
        const result = await this.prisma.$transaction(async (tx) => {
            // Create or update payment record
            let payment
            if (order.payment) {
                // Update existing payment
                payment = await tx.payment.update({
                    where: { id: order.payment.id },
                    data: {
                        amount: order.totalAmount,
                        method: 'CASH',
                        status: 'SUCCESS',
                    },
                })
            } else {
                // Create new payment record
                payment = await tx.payment.create({
                    data: {
                        orderId,
                        amount: order.totalAmount,
                        method: 'CASH',
                        status: 'SUCCESS',
                    },
                })
            }

            // Update order status to COMPLETED
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.COMPLETED,
                },
                include: {
                    table: true,
                    items: true,
                    payment: true,
                },
            })

            // Update inventory (decrease stock quantity)
            await this.updateInventoryForCompletedOrder(
                order.items.map((item) => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                })),
                tx
            )

                // Check if table has other active orders before setting AVAILABLE
                const hasOtherActiveOrders = await this.hasActiveOrdersOnTable(
                    order.tableId,
                    order.restaurantId,
                    orderId,
                    tx
                )

                // Only reset table status if no other active orders
                if (!hasOtherActiveOrders) {
                    const currentTable = await tx.table.findUnique({
                        where: { id: order.tableId },
                    })
                    const previousTableStatus = currentTable?.status || TableStatus.OCCUPIED

                    await tx.table.update({
                        where: { id: order.tableId },
                        data: { status: TableStatus.AVAILABLE },
                    })

                    // Note: Table status event will be emitted after transaction commits
                    // Store info for later emission
                    if (previousTableStatus !== TableStatus.AVAILABLE) {
                        // We'll emit this after transaction
                        return {
                            ...updatedOrder,
                            _tableStatusChanged: {
                                tableId: order.tableId,
                                previousStatus: previousTableStatus,
                                newStatus: TableStatus.AVAILABLE,
                                orderId,
                            },
                        }
                    }
                }

                return updatedOrder
            })

            // Emit table status change after transaction commits
            if (result._tableStatusChanged) {
                const tableStatusEvent: TableStatusEvent = result._tableStatusChanged
                this.socketService.emitTableStatusChanged(
                    order.restaurantId,
                    tableStatusEvent
                )
                // Remove temporary field
                delete result._tableStatusChanged
            }

        // Emit order completed event (with retry logic)
        const statusEvent: OrderStatusChangedEvent = {
            orderId,
            previousStatus: order.status,
            newStatus: OrderStatus.COMPLETED,
            updatedAt: new Date().toISOString(),
        }
        await this.socketService.emitOrderStatusChanged(
            order.restaurantId,
            order.tableId,
            statusEvent
        )

        this.logger.log(`Order ${orderId} paid with cash and completed`)

        return result
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

    /**
     * Update inventory (stock quantity) when order is completed
     * Decreases stockQuantity for each menu item in the order
     * Auto-updates status to SOLD_OUT if stock reaches 0
     */
    private async updateInventoryForCompletedOrder(
        orderItems: Array<{ menuItemId: number; quantity: number }>,
        tx?: Prisma.TransactionClient
    ) {
        const prismaClient = tx || this.prisma

        for (const item of orderItems) {
            const menuItem = await prismaClient.menuItem.findUnique({
                where: { id: item.menuItemId },
            })

            if (!menuItem) {
                this.logger.warn(
                    `Menu item ${item.menuItemId} not found, skipping inventory update`
                )
                continue
            }

            // Only update if stockQuantity is not null (null = unlimited stock)
            if (menuItem.stockQuantity !== null) {
                const newStock = menuItem.stockQuantity - item.quantity
                const updatedStock = Math.max(0, newStock) // Prevent negative stock

                // Check if status needs to change
                const previousStatus = menuItem.status
                const newStatus = updatedStock === 0 ? ('SOLD_OUT' as any) : menuItem.status
                const statusChanged = previousStatus !== newStatus

                // Update stock and status
                await prismaClient.menuItem.update({
                    where: { id: item.menuItemId },
                    data: {
                        stockQuantity: updatedStock,
                        // Auto-update status to SOLD_OUT if stock reaches 0
                        status: newStatus,
                    },
                })

                this.logger.log(
                    `Updated inventory for menu item ${item.menuItemId}: ${menuItem.stockQuantity} -> ${updatedStock}${statusChanged ? ` (status: ${previousStatus} -> ${newStatus})` : ''}`
                )

                // Emit menu item status change event if status changed
                if (statusChanged) {
                    const menuItemStatusEvent: MenuItemStatusChangedEvent = {
                        menuItemId: item.menuItemId,
                        restaurantId: menuItem.restaurantId,
                        previousStatus,
                        newStatus,
                        stockQuantity: updatedStock,
                        updatedAt: new Date().toISOString(),
                    }
                    // Emit menu item status change to all customers
                    this.socketService.emitMenuItemStatusChanged(
                        menuItem.restaurantId,
                        menuItemStatusEvent
                    )

                    // Also emit notification for kitchen/admin
                    const notification: NotificationEvent = {
                        id: `menu-item-status-${item.menuItemId}-${Date.now()}`,
                        type: newStatus === 'SOLD_OUT' ? 'warning' : 'info',
                        title: 'Menu Item Status Changed',
                        message: `${menuItem.name} is now ${newStatus === 'SOLD_OUT' ? 'sold out' : 'available'}`,
                        timestamp: new Date().toISOString(),
                    }
                    // Emit to restaurant room (all customers will receive)
                    this.socketService.emitNotification(
                        `restaurant:${menuItem.restaurantId}`,
                        notification
                    )
                }

                // Emit notification if stock is low (<= 5)
                if (updatedStock > 0 && updatedStock <= 5) {
                    const notification: NotificationEvent = {
                        id: `low-stock-${item.menuItemId}-${Date.now()}`,
                        type: 'warning',
                        title: 'Low Stock Alert',
                        message: `${menuItem.name} is running low (${updatedStock} remaining)`,
                        timestamp: new Date().toISOString(),
                        sound: true,
                    }
                    // Emit to kitchen and admin (with retry logic)
                    await this.socketService.emitKitchenNotification(
                        menuItem.restaurantId,
                        notification
                    )
                }

                // Emit notification if stock is out
                if (updatedStock === 0) {
                    const notification: NotificationEvent = {
                        id: `out-of-stock-${item.menuItemId}-${Date.now()}`,
                        type: 'error',
                        title: 'Out of Stock',
                        message: `${menuItem.name} is now out of stock`,
                        timestamp: new Date().toISOString(),
                        sound: true,
                    }
                    await this.socketService.emitKitchenNotification(
                        menuItem.restaurantId,
                        notification
                    )
                }
            }
        }
    }

    /**
     * Check if table has any active orders (not COMPLETED or CANCELLED)
     * Returns true if table should remain OCCUPIED
     */
    private async hasActiveOrdersOnTable(
        tableId: number,
        restaurantId: number,
        excludeOrderId?: number,
        tx?: Prisma.TransactionClient
    ): Promise<boolean> {
        const prismaClient = tx || this.prisma

        const activeOrderCount = await prismaClient.order.count({
            where: {
                tableId,
                restaurantId,
                id: excludeOrderId ? { not: excludeOrderId } : undefined,
                status: {
                    notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
                },
            },
        })

        return activeOrderCount > 0
    }

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

        // Check if there's a pending payment
        if (order.payment?.status === 'PENDING' && order.payment.method === 'CARD') {
            // If there's already a pending card payment, we could return existing session
            // For now, we'll create a new one (Stripe will handle duplicates)
            this.logger.warn(`Order ${orderId} already has a pending card payment`)
        }

        // Create or update payment record with PENDING status
        let payment = order.payment
        if (!payment) {
            payment = await this.prisma.payment.create({
                data: {
                    orderId: order.id,
                    amount: order.totalAmount,
                    method: 'CARD',
                    status: 'PENDING',
                },
            })
        } else if (payment.status !== 'PENDING' || payment.method !== 'CARD') {
            // Update existing payment to CARD and PENDING
            payment = await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    method: 'CARD',
                    status: 'PENDING',
                },
            })
        }

        // Create Stripe checkout session
        // Note: VND has no decimal places (smallest unit), so we don't multiply by 100
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: order.items.map((item: any) => ({
                price_data: {
                    currency: 'vnd',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.round(Number(item.pricePerUnit)), // VND has no cents, use amount as-is
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

        // Update payment with session ID
        if (session.id) {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    externalTransactionId: session.id,
                },
            })
        }

        return {
            sessionId: session.id,
            url: session.url,
        }
    }

    /**
     * Handle Stripe webhook events
     */
    async handleStripeWebhook(signature: string, body: Buffer) {
        this.logger.log('🔔 Stripe webhook received')
        
        if (!this.stripe) {
            this.logger.error('Stripe client not initialized')
            throw new BadRequestException('Stripe is not configured')
        }

        const webhookSecret = this.configService.get<string>(
            'stripe.webhookSecret'
        )
        if (!webhookSecret) {
            this.logger.error('Stripe webhook secret not configured')
            throw new BadRequestException(
                'Stripe webhook secret is not configured. Please set STRIPE_WEBHOOK_SECRET in .env'
            )
        }

        if (!body || body.length === 0) {
            this.logger.error('Webhook body is empty')
            throw new BadRequestException('Webhook body is empty')
        }

        if (!signature) {
            this.logger.error('Webhook signature is missing')
            throw new BadRequestException('Missing stripe-signature header')
        }

        this.logger.log(`Webhook body size: ${body.length} bytes`)
        this.logger.log(`Webhook signature: ${signature.substring(0, 20)}...`)

        let event: Stripe.Event

        try {
            event = this.stripe.webhooks.constructEvent(
                body,
                signature,
                webhookSecret
            )
            this.logger.log(`✅ Webhook signature verified. Event type: ${event.type}`)
        } catch (err: any) {
            this.logger.error(`❌ Webhook signature verification failed: ${err.message}`)
            this.logger.error(`Webhook secret configured: ${webhookSecret ? 'Yes' : 'No'}`)
            this.logger.error(`Webhook secret length: ${webhookSecret?.length || 0}`)
            throw new BadRequestException(
                `Webhook signature verification failed: ${err.message}. Please check STRIPE_WEBHOOK_SECRET in .env`
            )
        }

        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session
            const orderId = parseInt(session.metadata?.orderId || '0', 10)

            if (!orderId) {
                this.logger.warn('Webhook received without orderId in metadata')
                return { received: true }
            }

            // Get order with relations
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    table: true,
                    payment: true,
                },
            })

            if (!order) {
                this.logger.error(`Order ${orderId} not found for webhook`)
                return { received: true }
            }

            // Check if payment already processed (idempotency)
            if (order.payment?.status === 'SUCCESS') {
                this.logger.log(`Payment for order ${orderId} already processed`)
                return { received: true }
            }

            // Get order items for inventory update
            const orderWithItems = await this.prisma.order.findUnique({
                where: { id: orderId },
                include: { items: true },
            })

            // Use transaction to ensure atomicity
            await this.prisma.$transaction(async (tx) => {
                // Update payment status
                await tx.payment.upsert({
                    where: { orderId },
                    create: {
                        orderId,
                        amount: order.totalAmount,
                        method: 'CARD',
                        status: 'SUCCESS',
                        externalTransactionId: session.id,
                    },
                    update: {
                        status: 'SUCCESS',
                        externalTransactionId: session.id,
                    },
                })

                // Update order status to COMPLETED
                await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: OrderStatus.COMPLETED,
                    },
                })

                // Update inventory (decrease stock quantity)
                if (orderWithItems) {
                    await this.updateInventoryForCompletedOrder(
                        orderWithItems.items.map((item) => ({
                            menuItemId: item.menuItemId,
                            quantity: item.quantity,
                        })),
                        tx
                    )
                }

                // Check if table has other active orders before setting AVAILABLE
                const hasOtherActiveOrders = await this.hasActiveOrdersOnTable(
                    order.tableId,
                    order.restaurantId,
                    orderId,
                    tx
                )

                // Only reset table status if no other active orders
                if (!hasOtherActiveOrders) {
                    const currentTable = await tx.table.findUnique({
                        where: { id: order.tableId },
                    })
                    const previousTableStatus = currentTable?.status || TableStatus.OCCUPIED

                    await tx.table.update({
                        where: { id: order.tableId },
                        data: {
                            status: TableStatus.AVAILABLE,
                        },
                    })

                    // Store table status change info for emission after transaction
                    if (previousTableStatus !== TableStatus.AVAILABLE) {
                        // This will be emitted after transaction commits
                    }
                }
            })

            // Emit table status change after transaction commits
            // Get table to check if status changed
            const updatedTable = await this.prisma.table.findUnique({
                where: { id: order.tableId },
            })
            if (updatedTable) {
                // Check if table was set to AVAILABLE (meaning no other active orders)
                const hasOtherActiveOrders = await this.hasActiveOrdersOnTable(
                    order.tableId,
                    order.restaurantId,
                    orderId
                )
                if (!hasOtherActiveOrders && updatedTable.status === TableStatus.AVAILABLE) {
                    // Table status was changed to AVAILABLE, emit event
                    const tableStatusEvent: TableStatusEvent = {
                        tableId: order.tableId,
                        previousStatus: TableStatus.OCCUPIED, // Was OCCUPIED before payment
                        newStatus: TableStatus.AVAILABLE,
                        orderId,
                    }
                    this.socketService.emitTableStatusChanged(
                        order.restaurantId,
                        tableStatusEvent
                    )
                }
            }

            // Emit socket events for real-time updates (with retry logic)
            const statusEvent: OrderStatusChangedEvent = {
                orderId,
                previousStatus: order.status,
                newStatus: OrderStatus.COMPLETED,
                updatedAt: new Date().toISOString(),
            }

            await this.socketService.emitOrderStatusChanged(
                order.restaurantId,
                order.tableId,
                statusEvent
            )

            // Emit notification to waiters (with retry logic)
            const notification: NotificationEvent = {
                id: `payment-${orderId}-${Date.now()}`,
                type: 'success',
                title: 'Payment Completed',
                message: `Order #${orderId} (${order.table.name}) has been paid successfully via card`,
                orderId,
                tableId: order.tableId,
                timestamp: new Date().toISOString(),
                sound: true,
            }

            await this.socketService.emitWaiterNotification(
                order.restaurantId,
                notification
            )

            this.logger.log(`Payment successful for order ${orderId} - Order completed and table ${order.table.name} is now available`)
        }

        return { received: true }
    }
}
