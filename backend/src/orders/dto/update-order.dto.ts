import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { OrderStatus, OrderItemStatus } from '@prisma/client'

/**
 * DTO for updating order (status, waiter assignment, etc.)
 */
export class UpdateOrderDto {
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus

    @IsOptional()
    @IsNumber()
    waiterId?: number

    @IsOptional()
    @IsString()
    note?: string

    @IsOptional()
    @IsNumber()
    @Min(1)
    guestCount?: number
}

/**
 * DTO for updating order item status
 */
export class UpdateOrderItemStatusDto {
    @IsEnum(OrderItemStatus)
    status: OrderItemStatus
}

/**
 * DTO for waiter accepting/rejecting order
 */
export class AcceptRejectOrderDto {
    @IsNumber()
    waiterId: number

    @IsOptional()
    @IsString()
    reason?: string
}

/**
 * DTO for assigning waiter to order
 */
export class AssignWaiterDto {
    @IsNumber()
    waiterId: number
}
