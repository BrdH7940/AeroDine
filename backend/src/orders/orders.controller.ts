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
     */
    @Get()
    findAll(
        @Query('restaurantId') restaurantId?: string,
        @Query('tableId') tableId?: string,
        @Query('waiterId') waiterId?: string,
        @Query('status') status?: OrderStatus | string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string
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
        }
        return this.ordersService.findAll(filters)
    }

    /**
     * Get one order by ID
     * GET /orders/:id
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.findOne(id)
    }

    /**
     * Update order
     * PATCH /orders/:id
     */
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateOrderDto: UpdateOrderDto
    ) {
        return this.ordersService.update(id, updateOrderDto)
    }

    /**
     * Cancel order
     * DELETE /orders/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    cancel(
        @Param('id', ParseIntPipe) id: number,
        @Query('reason') reason?: string
    ) {
        return this.ordersService.cancel(id, reason)
    }

    // ========================================================================
    // ORDER ITEMS
    // ========================================================================

    /**
     * Add items to existing order
     * POST /orders/:id/items
     */
    @Post(':id/items')
    addItems(
        @Param('id', ParseIntPipe) id: number,
        @Body() addItemsDto: AddItemsToOrderDto
    ) {
        return this.ordersService.addItemsToOrder(id, addItemsDto)
    }

    // ========================================================================
    // WAITER OPERATIONS
    // ========================================================================

    /**
     * Get pending orders for waiter dashboard
     * GET /orders/waiter/pending?restaurantId=1
     */
    @Get('waiter/pending')
    getPendingOrders(
        @Query('restaurantId', ParseIntPipe) restaurantId: number
    ) {
        return this.ordersService.getPendingOrders(restaurantId)
    }

    /**
     * Assign waiter to order
     * POST /orders/:id/assign
     */
    @Post(':id/assign')
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
    @Post(':id/accept')
    acceptOrder(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { waiterId: number }
    ) {
        return this.ordersService.acceptOrder(id, body.waiterId)
    }

    /**
     * Reject order (waiter)
     * POST /orders/:id/reject
     */
    @Post(':id/reject')
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
    @Post(':id/serve')
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
    @Get('kitchen/display')
    getKitchenOrders(
        @Query('restaurantId', ParseIntPipe) restaurantId: number
    ) {
        return this.ordersService.getKitchenOrders(restaurantId)
    }

    /**
     * Update order item status (Kitchen)
     * PATCH /orders/items/:itemId/status
     */
    @Patch('items/:itemId/status')
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
    @Post('items/:itemId/start')
    startPreparingItem(@Param('itemId', ParseIntPipe) itemId: number) {
        return this.ordersService.startPreparingItem(itemId)
    }

    /**
     * Mark item as ready (Kitchen)
     * POST /orders/items/:itemId/ready
     */
    @Post('items/:itemId/ready')
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
