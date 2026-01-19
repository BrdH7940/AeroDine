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
     */
    @Throttle({ short: { ttl: 60000, limit: 5 } }) // 5 orders per minute
    @Post()
    @ApiOperation({
        summary: 'Create a new order',
        description:
            'Creates a new order. Rate limited to 5 requests per minute per IP to prevent spam attacks.',
    })
    @ApiResponse({
        status: 201,
        description: 'Order created successfully (status: PENDING_REVIEW)',
    })
    @ApiResponse({
        status: 429,
        description: 'Too many requests. Please try again later.',
    })
    create(@Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.create(createOrderDto)
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

    /**
     * Get one order by ID
     * GET /orders/:id
     * ADMIN/WAITER can see any order, CUSTOMER can only see their own orders
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
    // WAITER OPERATIONS
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
    // KITCHEN OPERATIONS
    // ========================================================================

    /**
     * Get orders for Kitchen Display System
     * GET /orders/kitchen?restaurantId=1
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
