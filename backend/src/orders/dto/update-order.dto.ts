import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { OrderStatus, OrderItemStatus } from '@aerodine/shared-types'

export class UpdateOrderStatusDto {
    @ApiProperty({
        example: 'IN_PROGRESS',
        enum: OrderStatus,
        description: 'New order status',
    })
    @IsEnum(OrderStatus)
    status: OrderStatus
}

export class UpdateOrderItemStatusDto {
    @ApiProperty({
        example: 'PREPARING',
        enum: OrderItemStatus,
        description: 'New order item status',
    })
    @IsEnum(OrderItemStatus)
    status: OrderItemStatus
}
