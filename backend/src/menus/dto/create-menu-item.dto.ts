import {
    IsArray,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator'
import { ItemStatus } from '@aerodine/shared-types'

export class CreateMenuItemDto {
    @IsInt()
    restaurantId: number

    @IsInt()
    categoryId: number

    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsOptional()
    description?: string | null

    @IsNumber()
    @Min(0)
    basePrice: number

    @IsEnum(ItemStatus)
    @IsOptional()
    status?: ItemStatus

    // image can be a remote URL or base64 data URI
    @IsString()
    @IsOptional()
    image?: string

    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    modifierGroupIds?: number[]
}


