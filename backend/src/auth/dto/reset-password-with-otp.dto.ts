import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordWithOtpDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email address',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string

    @ApiProperty({
        example: '123456',
        description: '6-digit OTP code received via email',
    })
    @IsString()
    @IsNotEmpty()
    otpCode: string

    @ApiProperty({
        example: 'newSecurePassword123',
        description: 'New password (minimum 6 characters)',
        minLength: 6,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    newPassword: string
}
