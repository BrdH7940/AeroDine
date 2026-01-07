import { IsInt, IsOptional, IsString, IsBoolean, IsEnum, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TableStatus } from '@aerodine/shared-types'

export class UpdateTableDto {
    @ApiProperty({ example: 'Table 1', required: false })
    @IsString()
    @IsOptional()
    name?: string

    @ApiProperty({ example: 4, required: false })
    @IsInt()
    @Min(1)
    @IsOptional()
    capacity?: number

    @ApiProperty({
        example: 'AVAILABLE',
        enum: TableStatus,
        required: false,
        description: 'Table status',
    })
    @IsEnum(TableStatus)
    @IsOptional()
    status?: TableStatus

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean
}

