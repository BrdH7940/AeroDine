import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import {
    UpdateOrderStatusDto,
    UpdateOrderItemStatusDto,
} from './dto/update-order.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, OrderStatus, OrderItemStatus } from '@aerodine/shared-types'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post()
    @ApiOperation({
        summary: 'Create a new order (Public)',
        description:
            'Creates a new order from QR token. Validates table token, fetches current prices from database, and creates order with all items and modifiers.',
    })
    @ApiResponse({
        status: 201,
        description: 'Order created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request (invalid items, inactive table, etc.)',
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or expired table token',
    })
    @ApiResponse({
        status: 404,
        description: 'Table or menu items not found',
    })
    create(@Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.create(createOrderDto)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.KITCHEN)
    @Get()
    @ApiOperation({
        summary: 'Get all orders (Staff/Admin only)',
        description:
            'Returns all orders with optional filters. Orders are sorted by createdAt (FIFO) for KDS. Includes full relations: items, modifiers, table, restaurant.',
    })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: OrderStatus,
        description: 'Filter by order status',
    })
    @ApiQuery({
        name: 'restaurantId',
        required: false,
        type: Number,
        description: 'Filter by restaurant ID',
    })
    @ApiResponse({
        status: 200,
        description: 'List of orders',
    })
    findAll(
        @Query('status') status?: OrderStatus,
        @Query('restaurantId') restaurantId?: string
    ) {
        const restaurantIdNum = restaurantId
            ? Number(restaurantId)
            : undefined
        return this.ordersService.findAll(status, restaurantIdNum)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.KITCHEN)
    @Get(':id')
    @ApiOperation({
        summary: 'Get order by ID (Staff/Admin only)',
    })
    @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
    @ApiResponse({
        status: 200,
        description: 'Order details',
    })
    @ApiResponse({
        status: 404,
        description: 'Order not found',
    })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.findOne(id)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.WAITER)
    @Patch(':id/status')
    @ApiOperation({
        summary: 'Update order status (Admin/Waiter only)',
        description:
            'Updates the order status (PENDING -> IN_PROGRESS -> COMPLETED)',
    })
    @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
    @ApiResponse({
        status: 200,
        description: 'Order status updated successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Order not found',
    })
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateOrderStatusDto: UpdateOrderStatusDto
    ) {
        return this.ordersService.updateStatus(id, updateOrderStatusDto)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.KITCHEN)
    @Patch(':id/items/:itemId/status')
    @ApiOperation({
        summary: 'Update order item status (Kitchen/Admin only)',
        description:
            'Updates individual order item status (QUEUED -> PREPARING -> READY -> SERVED)',
    })
    @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
    @ApiParam({ name: 'itemId', type: Number, description: 'Order Item ID' })
    @ApiResponse({
        status: 200,
        description: 'Order item status updated successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Order or order item not found',
    })
    updateItemStatus(
        @Param('id', ParseIntPipe) orderId: number,
        @Param('itemId', ParseIntPipe) itemId: number,
        @Body() updateOrderItemStatusDto: UpdateOrderItemStatusDto
    ) {
        return this.ordersService.updateItemStatus(
            orderId,
            itemId,
            updateOrderItemStatusDto.status
        )
    }
}
