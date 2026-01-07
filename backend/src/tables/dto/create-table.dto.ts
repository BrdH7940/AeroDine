import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateTableDto {
    @ApiProperty({
        example: 1,
        description: 'Restaurant ID (ADMIN must specify this)',
    })
    @IsInt()
    @IsNotEmpty()
    restaurantId: number

    @ApiProperty({ example: 'Table 1' })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: 4, description: 'Number of seats', default: 4 })
    @IsInt()
    @Min(1)
    capacity: number
}

