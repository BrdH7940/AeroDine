import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@aerodine/shared-types'

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string

    @ApiProperty({ example: 'password123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    fullName: string

    @ApiProperty({
        enum: UserRole,
        required: false,
        default: UserRole.CUSTOMER,
        description: 'User role',
    })
    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole
}
