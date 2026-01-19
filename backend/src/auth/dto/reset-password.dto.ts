import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'Password reset token received via email',
    })
    @IsString()
    @IsNotEmpty()
    token: string

    @ApiProperty({
        example: 'newSecurePassword123!',
        description: 'New password (minimum 8 characters, must contain uppercase, lowercase, and number)',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    })
    newPassword: string
}
