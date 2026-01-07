import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

export class CreateModifierGroupDto {
    @IsInt()
    restaurantId: number

    @IsString()
    @IsNotEmpty()
    name: string

    @IsInt()
    @Min(0)
    minSelection: number

    @IsInt()
    @Min(1)
    maxSelection: number
}


