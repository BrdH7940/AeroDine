import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    Matches,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string

    @ApiProperty({ 
        example: 'SecurePass123!', 
        minLength: 8,
        description: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number'
    })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    })
    password: string

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    fullName: string

    // Role removed from registration - all new users are CUSTOMER by default
    // Only ADMIN can create users with other roles via /users endpoint
}
