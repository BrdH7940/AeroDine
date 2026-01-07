import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator'
import { UserRole } from '@aerodine/shared-types'

export class CreateUserDto {
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
}
