import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/create-auth.dto'
import { LoginDto } from './dto/update-auth.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import {
    ApiBearerAuth,
    ApiTags,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({
        summary: 'Register a new user',
        description: 'Register with role (ADMIN, WAITER, KITCHEN, CUSTOMER)',
    })
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto)
    }

    @Post('login')
    @ApiOperation({ summary: 'Login and receive JWT access token' })
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile (requires JWT)' })
    profile(@CurrentUser() user: any) {
        return user
    }

    @Post('forgot-password')
    @ApiOperation({
        summary: 'Request password reset',
        description:
            'Sends a password reset email to the user. Always returns success to prevent email enumeration.',
    })
    @ApiResponse({
        status: 200,
        description: 'Password reset email sent (if email exists)',
        schema: {
            example: {
                message:
                    'If an account with that email exists, a password reset link has been sent.',
            },
        },
    })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto)
    }

    @Post('reset-password')
    @ApiOperation({
        summary: 'Reset password with token',
        description:
            'Resets user password using the token received via email. Token expires in 15 minutes.',
    })
    @ApiResponse({
        status: 200,
        description: 'Password reset successfully',
        schema: {
            example: {
                message: 'Password has been reset successfully',
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid or expired token',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto)
    }
}
