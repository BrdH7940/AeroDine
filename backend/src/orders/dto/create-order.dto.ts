import {
    IsNumber,
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class CreateOrderItemModifierDto {
    @IsOptional()
    @IsNumber()
    modifierOptionId?: number

    @IsString()
    @IsNotEmpty()
    modifierName: string

    @IsNumber()
    priceAdjustment: number
}

export class CreateOrderItemDto {
    @IsNumber()
    @IsNotEmpty()
    menuItemId: number

    @IsString()
    @IsNotEmpty()
    name: string

    @IsNumber()
    @IsNotEmpty()
    quantity: number

    @IsNumber()
    @IsNotEmpty()
    pricePerUnit: number

    @IsOptional()
    @IsString()
    note?: string

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemModifierDto)
    modifiers?: CreateOrderItemModifierDto[]
}

export class CreateOrderDto {
    @IsNumber()
    @IsNotEmpty()
    tableId: number

    @IsNumber()
    @IsNotEmpty()
    restaurantId: number

    @IsOptional()
    @IsNumber()
    guestCount?: number

    @IsOptional()
    @IsString()
    note?: string

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    @IsNotEmpty()
    items: CreateOrderItemDto[]
}
