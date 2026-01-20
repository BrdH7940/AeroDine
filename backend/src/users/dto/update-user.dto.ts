import { PartialType } from '@nestjs/mapped-types'
import { IsString, IsOptional, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { CreateUserDto } from './create-user.dto'

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({
        example: 'John Doe',
        description: 'User full name',
        required: false,
        minLength: 1,
        maxLength: 100,
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty({ message: 'Full name cannot be empty' })
    @MinLength(1, { message: 'Full name must be at least 1 character long' })
    @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
    @Matches(/^[a-zA-Z\s\u00C0-\u1FFF\u2C00-\uD7FF'-]+$/, {
        message: 'Full name can only contain letters, spaces, hyphens, and apostrophes',
    })
    fullName?: string

    @ApiProperty({
        example: 'https://res.cloudinary.com/example/image/upload/v1234567890/avatar.jpg',
        description: 'User avatar URL',
        required: false,
    })
    @IsString()
    @IsOptional()
    avatar?: string
}
