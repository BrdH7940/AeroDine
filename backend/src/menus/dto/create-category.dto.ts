import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateCategoryDto {
    @IsInt()
    restaurantId: number

    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsOptional()
    image?: string | null

    @IsInt()
    @IsOptional()
    rank?: number
}


