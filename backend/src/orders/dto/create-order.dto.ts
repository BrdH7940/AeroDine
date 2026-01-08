import {
    IsNumber,
    IsOptional,
    IsString,
    IsArray,
    ValidateNested,
    Min,
    ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * DTO for creating order item modifiers
 */
export class CreateOrderItemModifierDto {
    @IsNumber()
    modifierOptionId: number

    @IsString()
    modifierName: string

    @IsNumber()
    priceAdjustment: number
}

/**
 * DTO for creating order items
 */
export class CreateOrderItemDto {
    @IsNumber()
    menuItemId: number

    @IsNumber()
    @Min(1)
    quantity: number

    @IsOptional()
    @IsString()
    note?: string

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemModifierDto)
    modifiers?: CreateOrderItemModifierDto[]
}

/**
 * DTO for creating a new order
 */
export class CreateOrderDto {
    @IsNumber()
    restaurantId: number

    @IsNumber()
    tableId: number

    @IsOptional()
    @IsNumber()
    userId?: number

    @IsOptional()
    @IsNumber()
    @Min(1)
    guestCount?: number

    @IsOptional()
    @IsString()
    note?: string

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[]
}

/**
 * DTO for adding items to existing order
 */
export class AddItemsToOrderDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[]
}

