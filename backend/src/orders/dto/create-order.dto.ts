import {
    IsString,
    IsNotEmpty,
    IsInt,
    Min,
    IsArray,
    ValidateNested,
    IsOptional,
    ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class CreateOrderItemDto {
    @ApiProperty({ example: 1, description: 'Menu item ID' })
    @IsInt()
    @IsNotEmpty()
    menuItemId: number

    @ApiProperty({ example: 2, description: 'Quantity of this item', minimum: 1 })
    @IsInt()
    @Min(1)
    quantity: number

    @ApiProperty({
        example: [1, 2, 3],
        description: 'Array of modifier option IDs',
        required: false,
        type: [Number],
    })
    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    modifierOptionIds?: number[]

    @ApiProperty({
        example: 'No onions, please',
        description: 'Special note for this item',
        required: false,
    })
    @IsString()
    @IsOptional()
    note?: string
}

export class CreateOrderDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'QR token from table scan',
    })
    @IsString()
    @IsNotEmpty()
    tableToken: string

    @ApiProperty({
        example: 2,
        description: 'Number of guests',
        minimum: 1,
        default: 1,
    })
    @IsInt()
    @Min(1)
    guestCount: number

    @ApiProperty({
        example: [
            {
                menuItemId: 1,
                quantity: 2,
                modifierOptionIds: [1, 2],
                note: 'No onions',
            },
        ],
        description: 'Array of order items',
        type: [CreateOrderItemDto],
    })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one item is required' })
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[]

    @ApiProperty({
        example: 'Please bring extra napkins',
        description: 'Optional order note',
        required: false,
    })
    @IsString()
    @IsOptional()
    note?: string
}
