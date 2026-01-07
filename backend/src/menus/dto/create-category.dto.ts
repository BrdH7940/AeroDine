import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCategoryDto {
    @ApiProperty({
        example: 1,
        description: 'Restaurant ID (ADMIN must specify this)',
    })
    @IsInt()
    restaurantId: number

    @ApiProperty({ example: 'Beverages' })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
    @IsString()
    @IsOptional()
    image?: string | null

    @ApiProperty({ example: 1, required: false, default: 0 })
    @IsInt()
    @IsOptional()
    rank?: number
}


