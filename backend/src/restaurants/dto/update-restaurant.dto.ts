import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateRestaurantDto {
    @ApiProperty({ example: 'AeroDine Signature', required: false })
    @IsString()
    @IsOptional()
    name?: string

    @ApiProperty({ example: '123 Main Street, Ho Chi Minh City', required: false })
    @IsString()
    @IsOptional()
    address?: string

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean
}
