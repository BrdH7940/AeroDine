import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    Req,
    UseGuards,
    ForbiddenException,
    Logger,
} from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import { OrdersService } from './orders.service'
import { CreateOrderDto, AddItemsToOrderDto } from './dto/create-order.dto'
import {
    UpdateOrderDto,
    UpdateOrderItemStatusDto,
    AssignWaiterDto,
    AcceptRejectOrderDto,
} from './dto/update-order.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole } from '@aerodine/shared-types'
import { OrderStatus } from '@prisma/client'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger'

/**
 * Orders Controller - REST API endpoints for order management
 *
 * @author Dev 2 - Operations Team
 */
@ApiTags('orders')
@Controller('orders')
export class OrdersController {
    private readonly logger = new Logger(OrdersController.name)

    constructor(private readonly ordersService: OrdersService) {}

    // ========================================================================
    // STRIPE PAYMENT ENDPOINTS
    // ========================================================================

    /**
     * Handle Stripe webhook events
     * POST /orders/webhook
     */
    @Post('webhook')
    @ApiOperation({ summary: 'Handle Stripe webhook events' })
    async handleWebhook(@Req() req: RawBodyRequest<Request>) {
        const signature = req.headers['stripe-signature'] as string
        if (!signature) {
            throw new Error('Missing stripe-signature header')
        }
        return this.ordersService.handleStripeWebhook(signature, req.rawBody as Buffer)
    }

    /**
     * Create Stripe checkout session for an order
     * POST /orders/:id/checkout
     */
    @Post(':id/checkout')
    @ApiOperation({ summary: 'Create Stripe checkout session for order payment' })
    async createCheckoutSession(
        @Param('id') id: string,
        @Body() body: { successUrl: string; cancelUrl: string },
    ) {
        return this.ordersService.createCheckoutSession(+id, body.successUrl, body.cancelUrl)
    }

    // ========================================================================
    // ORDER CRUD
    // ========================================================================

    /**
     * Create a new order
     * POST /orders
     * Case 3: Rate limiting to prevent spam orders
     * - Limit: 5 requests per minute per IP
     * - This prevents DDoS attacks and spam order creation
     * 
     * Authentication: Optional (OptionalJwtAuthGuard)
     * - Guest customers can place orders without authentication
     * - Authenticated customers automatically have their userId captured
     * - Guest orders are tracked via guestSessionId (from header or cookie)
     * - This allows logged-in customers to track their order history
     */
    @UseGuards(OptionalJwtAuthGuard)
    @Throttle({ short: { ttl: 60000, limit: 5 } }) // 5 orders per minute
    @Post()
    @ApiOperation({
        summary: 'Create a new order',
        description:
            'Creates a new order. Rate limited to 5 requests per minute per IP to prevent spam attacks. ' +
            'Optionally captures userId if customer is authenticated. Guest orders are supported.',
    })
    @ApiResponse({
        status: 201,
        description: 'Order created successfully (status: PENDING_REVIEW)',
    })
    @ApiResponse({
        status: 429,
        description: 'Too many requests. Please try again later.',
    })
    create(
        @Body() createOrderDto: CreateOrderDto,
        @CurrentUser() user?: any,
        @Req() req?: any
    ) {
        // Automatically set userId if customer is authenticated
        // This allows customers to view their order history after logging in
        if (user?.id && !createOrderDto.userId) {
            createOrderDto.userId = user.id
            this.logger.log(`Order creation: Auto-assigned userId ${user.id} from authenticated user`)
        } else if (!user) {
            this.logger.log('Order creation: Guest order (no userId)')
        }

        // Get guest session ID from header or cookie for guest users
        const guestSessionId = user 
            ? undefined 
            : (req?.headers?.['x-guest-session-id'] || req?.cookies?.['guestSessionId'])

        return this.ordersService.create(createOrderDto, guestSessionId)
    }

    /**
     * Get all orders with filters
     * GET /orders?restaurantId=1&status=PENDING&page=1&pageSize=20
     * ADMIN/WAITER can see all orders, CUSTOMER can only see their own orders
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({
        summary: 'Get all orders with filters',
        description: 'ADMIN/WAITER can see all orders. CUSTOMER can only see their own orders.',
    })
    findAll(
        @Query('restaurantId') restaurantId?: string,
        @Query('tableId') tableId?: string,
        @Query('waiterId') waiterId?: string,
        @Query('status') status?: OrderStatus | string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @CurrentUser() user?: any
    ) {
        const filters = {
            restaurantId: restaurantId ? parseInt(restaurantId) : undefined,
            tableId: tableId ? parseInt(tableId) : undefined,
            waiterId: waiterId ? parseInt(waiterId) : undefined,
            status: status
                ? status.includes(',')
                    ? (status.split(',') as OrderStatus[])
                    : (status as OrderStatus)
                : undefined,
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined,
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 20,
            // For CUSTOMER role, only show their own orders
            customerId: user?.role === UserRole.CUSTOMER ? user.id : undefined,
        }
        return this.ordersService.findAll(filters)
    }

    // ========================================================================
    // WAITER OPERATIONS - Specific routes (must be before :id route)
    // ========================================================================

    /**
     * Get pending orders for waiter dashboard
     * GET /orders/waiter/pending?restaurantId=1
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.WAITER, UserRole.ADMIN)
    @Get('waiter/pending')
    @ApiOperation({
        summary: 'Get pending orders for waiter (WAITER/ADMIN only)',
        description: 'Returns pending orders for waiter dashboard.',
    })
    getPendingOrders(
        @Query('restaurantId', ParseIntPipe) restaurantId: number
    ) {
        return this.ordersService.getPendingOrders(restaurantId)
    }

    // ========================================================================
    // CUSTOMER OPERATIONS - Public routes for guest customers
    // ========================================================================

    /**
     * Get orders by table ID (PUBLIC - for customer order tracking)
     * GET /orders/table/:tableId
     * Authentication optional - filters orders based on login status:
     * - Logged in: shows only unpaid/uncompleted orders of that user at table
     * - Guest: shows only unpaid/uncompleted guest orders matching guestSessionId at table
     */
    @UseGuards(OptionalJwtAuthGuard)
    @Get('table/:tableId')
    @ApiOperation({
        summary: 'Get orders by table ID (PUBLIC)',
        description: 'Endpoint for customers to track their orders. Filters by login status and payment status.',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns unpaid/uncompleted orders for the specified table',
    })
    getOrdersByTable(
        @Param('tableId', ParseIntPipe) tableId: number,
        @CurrentUser() user?: any,
        @Req() req?: any
    ) {
        // Get guest session ID from header or cookie for guest users
        const guestSessionId = user 
            ? undefined 
            : (req?.headers?.['x-guest-session-id'] || req?.cookies?.['guestSessionId'])
        
        return this.ordersService.getOrdersByTableForCustomer(tableId, user?.id, guestSessionId)
    }

    /**
     * Get orders by guest session ID (PUBLIC - for guest order tracking)
     * GET /orders/guest
     * No authentication required - returns all orders for the guest session
     */
    @Get('guest')
    @ApiOperation({
        summary: 'Get orders by guest session ID (PUBLIC)',
        description: 'Returns all orders (including completed) for the guest session. Guest session ID is sent via x-guest-session-id header.',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns all orders for the guest session',
    })
    getOrdersByGuestSession(@Req() req?: any) {
        const guestSessionId = req?.headers?.['x-guest-session-id'] || req?.cookies?.['guestSessionId']
        
        if (!guestSessionId) {
            return { orders: [], total: 0 }
        }
        
        return this.ordersService.getOrdersByGuestSession(guestSessionId)
    }

    /**
     * Get single order by ID (PUBLIC - for customer order tracking)
     * GET /orders/public/:id
     * No authentication required - guests can view their order details
     */
    @Get('public/:id')
    @ApiOperation({
        summary: 'Get order by ID (PUBLIC)',
        description: 'Public endpoint for customers to view order details without authentication.',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns order details',
    })
    getPublicOrder(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.findOne(id)
    }

    // ========================================================================
    // KITCHEN OPERATIONS - Specific routes (must be before :id route)
    // ========================================================================

    /**
     * Get orders for Kitchen Display System
     * GET /orders/kitchen/display?restaurantId=1
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.KITCHEN, UserRole.ADMIN)
    @Get('kitchen/display')
    @ApiOperation({
        summary: 'Get kitchen orders (KITCHEN/ADMIN only)',
        description: 'Returns orders for Kitchen Display System.',
    })
    getKitchenOrders(
        @Query('restaurantId', ParseIntPipe) restaurantId: number
    ) {
        return this.ordersService.getKitchenOrders(restaurantId)
    }

    /**
     * Get one order by ID
     * GET /orders/:id
     * ADMIN/WAITER can see any order, CUSTOMER can only see their own orders
     * NOTE: This dynamic route must be after all specific routes (waiter/pending, kitchen/display)
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({
        summary: 'Get order by ID',
        description: 'ADMIN/WAITER can see any order. CUSTOMER can only see their own orders.',
    })
    async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
        const order = await this.ordersService.findOne(id)
        
        // CUSTOMER can only view their own orders
        // Order has userId field (mapped from user_id in database)
        if (user.role === UserRole.CUSTOMER && order.userId !== user.id) {
            throw new ForbiddenException('You can only view your own orders')
        }
        
        return order
    }

    /**
     * Update order
     * PATCH /orders/:id
     * Only ADMIN/WAITER can update orders
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.WAITER)
    @Patch(':id')
    @ApiOperation({
        summary: 'Update order (ADMIN/WAITER only)',
        description: 'Only ADMIN and WAITER can update orders.',
    })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateOrderDto: UpdateOrderDto
    ) {
        return this.ordersService.update(id, updateOrderDto)
    }

    /**
     * Cancel order
     * DELETE /orders/:id
     * ADMIN/WAITER can cancel any order, CUSTOMER can only cancel their own orders
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Cancel order',
        description: 'ADMIN/WAITER can cancel any order. CUSTOMER can only cancel their own orders.',
    })
    async cancel(
        @Param('id', ParseIntPipe) id: number,
        @Query('reason') reason?: string,
        @CurrentUser() user?: any
    ) {
        // CUSTOMER can only cancel their own orders
        if (user?.role === UserRole.CUSTOMER) {
            const order = await this.ordersService.findOne(id)
            if (order.userId !== user.id) {
                throw new ForbiddenException('You can only cancel your own orders')
            }
        }
        
        return this.ordersService.cancel(id, reason)
    }

    // ========================================================================
    // ORDER ITEMS
    // ========================================================================

    /**
     * Add items to existing order
     * POST /orders/:id/items
     * CUSTOMER can add items to their own orders, ADMIN/WAITER can add to any order
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post(':id/items')
    @ApiOperation({
        summary: 'Add items to order',
        description: 'CUSTOMER can add items to their own orders. ADMIN/WAITER can add to any order.',
    })
    async addItems(
        @Param('id', ParseIntPipe) id: number,
        @Body() addItemsDto: AddItemsToOrderDto,
        @CurrentUser() user?: any
    ) {
        // CUSTOMER can only add items to their own orders
        if (user?.role === UserRole.CUSTOMER) {
            const order = await this.ordersService.findOne(id)
            if (order.userId !== user.id) {
                throw new ForbiddenException('You can only add items to your own orders')
            }
        }
        
        return this.ordersService.addItemsToOrder(id, addItemsDto)
    }

    // ========================================================================
    // WAITER OPERATIONS (continued)
    // ========================================================================

    /**
     * Assign waiter to order
     * POST /orders/:id/assign
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.WAITER, UserRole.ADMIN)
    @Post(':id/assign')
    @ApiOperation({
        summary: 'Assign waiter to order (WAITER/ADMIN only)',
        description: 'Assigns a waiter to an order.',
    })
    assignWaiter(
        @Param('id', ParseIntPipe) id: number,
        @Body() assignDto: AssignWaiterDto
    ) {
        return this.ordersService.assignWaiter(id, assignDto)
    }

    /**
     * Accept order (waiter)
     * POST /orders/:id/accept
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.WAITER, UserRole.ADMIN)
    @Post(':id/accept')
    @ApiOperation({
        summary: 'Accept order (WAITER/ADMIN only)',
        description: 'Waiter accepts an order.',
    })
    acceptOrder(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { waiterId: number; mergeWithOrderId?: number }
    ) {
        return this.ordersService.acceptOrder(id, body.waiterId, body.mergeWithOrderId)
    }

    /**
     * Reject order (waiter)
     * POST /orders/:id/reject
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.WAITER, UserRole.ADMIN)
    @Post(':id/reject')
    @ApiOperation({
        summary: 'Reject order (WAITER/ADMIN only)',
        description: 'Waiter rejects an order with a reason.',
    })
    rejectOrder(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: AcceptRejectOrderDto
    ) {
        return this.ordersService.rejectOrder(id, body.waiterId, body.reason)
    }

    /**
     * Mark order as served
     * POST /orders/:id/serve
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.WAITER, UserRole.ADMIN)
    @Post(':id/serve')
    @ApiOperation({
        summary: 'Mark order as served (WAITER/ADMIN only)',
        description: 'Marks an order as served.',
    })
    markServed(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.markOrderServed(id)
    }

    /**
     * Process cash payment for order
     * POST /orders/:id/pay-cash
     * Case 2: Trust Your Device - Only authenticated staff can confirm cash payment
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.WAITER, UserRole.ADMIN)
    @Post(':id/pay-cash')
    @ApiOperation({
        summary: 'Process cash payment for order (WAITER/ADMIN only)',
        description:
            'Waiter confirms cash payment from their device. This prevents fake payment screens from customers.',
    })
    @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Payment processed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Staff authentication required' })
    @ApiResponse({ status: 403, description: 'Forbidden - Waiter/Admin role required' })
    payCash(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.processCashPayment(id)
    }

    // ========================================================================
    // KITCHEN OPERATIONS (continued)
    // ========================================================================

    /**
     * Update order item status (Kitchen)
     * PATCH /orders/items/:itemId/status
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.KITCHEN, UserRole.ADMIN)
    @Patch('items/:itemId/status')
    @ApiOperation({
        summary: 'Update order item status (KITCHEN/ADMIN only)',
        description: 'Updates the status of an order item.',
    })
    updateItemStatus(
        @Param('itemId', ParseIntPipe) itemId: number,
        @Body() updateDto: UpdateOrderItemStatusDto
    ) {
        return this.ordersService.updateOrderItemStatus(itemId, updateDto)
    }

    /**
     * Start preparing item (Kitchen)
     * POST /orders/items/:itemId/start
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.KITCHEN, UserRole.ADMIN)
    @Post('items/:itemId/start')
    @ApiOperation({
        summary: 'Start preparing item (KITCHEN/ADMIN only)',
        description: 'Marks an order item as being prepared.',
    })
    startPreparingItem(@Param('itemId', ParseIntPipe) itemId: number) {
        return this.ordersService.startPreparingItem(itemId)
    }

    /**
     * Mark item as ready (Kitchen)
     * POST /orders/items/:itemId/ready
     */
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.KITCHEN, UserRole.ADMIN)
    @Post('items/:itemId/ready')
    @ApiOperation({
        summary: 'Mark item as ready (KITCHEN/ADMIN only)',
        description: 'Marks an order item as ready.',
    })
    markItemReady(@Param('itemId', ParseIntPipe) itemId: number) {
        return this.ordersService.markItemReady(itemId)
    }

    // ========================================================================
    // BILL OPERATIONS
    // ========================================================================

    /**
     * Request bill for order
     * POST /orders/:id/bill
     */
    @Post(':id/bill')
    requestBill(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.requestBill(id)
    }
}
