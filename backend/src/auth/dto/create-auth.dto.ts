import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    IsInt,
} from 'class-validator'
import { UserRole } from '@aerodine/shared-types'

export class RegisterDto {
    @IsEmail()
    email: string

    @IsString()
    @MinLength(6)
    password: string

    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole

    @IsInt()
    @IsOptional()
    restaurantId?: number
}
