import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifyOtpDto {
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
    @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
    otpCode: string
}
