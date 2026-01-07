import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateModifierOptionDto {
    @IsInt()
    groupId: number

    @IsString()
    @IsNotEmpty()
    name: string

    @IsNumber()
    @Min(0)
    priceAdjustment: number

    @IsBoolean()
    @IsOptional()
    isAvailable?: boolean
}


