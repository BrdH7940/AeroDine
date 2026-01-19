import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    Matches,
} from 'class-validator'
import { UserRole } from '@aerodine/shared-types'

export class CreateUserDto {
    @IsEmail()
    email: string

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    })
    password: string

    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole
}
