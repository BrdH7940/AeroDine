import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
    Req,
    Res,
    HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/create-auth.dto'
import { LoginDto } from './dto/update-auth.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { ResetPasswordWithOtpDto } from './dto/reset-password-with-otp.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { GoogleAuthGuard } from './guards/google-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { ConfigService } from '@nestjs/config'
import {
    ApiBearerAuth,
    ApiTags,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService
    ) {}

    @Throttle({ short: { ttl: 60000, limit: 5 } }) // 5 requests per minute
    @Post('register')
    @ApiOperation({
        summary: 'Register a new user',
        description: 'Register a new user account. Rate limited to 5 requests per minute. All new users are created with CUSTOMER role.',
    })
    @ApiResponse({
        status: 429,
        description: 'Too many registration attempts. Please try again later.',
    })
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto)
    }

    @Throttle({ short: { ttl: 60000, limit: 5 } }) // 5 requests per minute
    @Post('login')
    @ApiOperation({ 
        summary: 'Login and receive JWT access token and refresh token',
        description: 'Rate limited to 5 requests per minute to prevent brute force attacks.',
    })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        schema: {
            example: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                user: {
                    id: 1,
                    email: 'user@example.com',
                    fullName: 'John Doe',
                    role: 'CUSTOMER',
                },
            },
        },
    })
    @ApiResponse({
        status: 429,
        description: 'Too many login attempts. Please try again later.',
    })
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto)
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        schema: {
            example: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                user: {
                    id: 1,
                    email: 'user@example.com',
                    fullName: 'John Doe',
                    role: 'CUSTOMER',
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or expired refresh token',
    })
    async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto.refresh_token)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @ApiOperation({ summary: 'Logout - invalidate refresh token (requires JWT)' })
    @ApiResponse({
        status: 200,
        description: 'Logout successful',
        schema: {
            example: {
                message: 'Logged out successfully',
            },
        },
    })
    async logout(@CurrentUser() user: any) {
        await this.authService.logout(user.id)
        return { message: 'Logged out successfully' }
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile (requires JWT)' })
    profile(@CurrentUser() user: any) {
        return user
    }

    @Throttle({ short: { ttl: 60000, limit: 3 } }) // 3 requests per minute
    @Post('forgot-password')
    @ApiOperation({
        summary: 'Request password reset with OTP',
        description:
            'Sends a 6-digit OTP code to the user email. Always returns success to prevent email enumeration. Rate limited to 3 requests per minute.',
    })
    @ApiResponse({
        status: 200,
        description: 'OTP code sent to email (if email exists)',
        schema: {
            example: {
                message:
                    'If an account with that email exists, a verification code has been sent.',
            },
        },
    })
    @ApiResponse({
        status: 429,
        description: 'Too many password reset requests. Please try again later.',
    })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto)
    }

    @Post('verify-otp')
    @ApiOperation({
        summary: 'Verify OTP code',
        description: 'Verifies the OTP code sent to user email for password reset.',
    })
    @ApiResponse({
        status: 200,
        description: 'OTP verified successfully',
        schema: {
            example: {
                message: 'Verification code verified successfully',
                verified: true,
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid or expired OTP code',
    })
    async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
        return this.authService.verifyOtp(verifyOtpDto)
    }

    @Post('reset-password-with-otp')
    @ApiOperation({
        summary: 'Reset password with OTP code',
        description:
            'Resets user password using the OTP code received via email. OTP expires in 10 minutes.',
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
        description: 'Invalid or expired OTP code',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async resetPasswordWithOtp(@Body() resetPasswordWithOtpDto: ResetPasswordWithOtpDto) {
        return this.authService.resetPasswordWithOtp(resetPasswordWithOtpDto)
    }

    @Post('reset-password')
    @ApiOperation({
        summary: 'Reset password with token (legacy)',
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

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Initiate Google OAuth login',
        description:
            'Redirects to Google OAuth consent screen. After user approves, they are redirected to /auth/google/callback',
    })
    @ApiResponse({
        status: 302,
        description: 'Redirects to Google OAuth',
    })
    async googleAuth() {
        // Guard handles the redirect
    }

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Google OAuth callback',
        description:
            'Handles the callback from Google OAuth. Generates JWT token and redirects to frontend with token.',
    })
    @ApiResponse({
        status: 302,
        description: 'Redirects to frontend with JWT token',
    })
    async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
        const user = req.user as any

        if (!user) {
            const frontendUrl =
                this.configService.get<string>('frontend.url') ||
                'http://localhost:5173'
            return res.redirect(
                `${frontendUrl}/auth/error?message=Google authentication failed`
            )
        }

        try {
            const result = await this.authService.googleLogin(user)
            const frontendUrl =
                this.configService.get<string>('frontend.url') ||
                'http://localhost:5173'

            // Redirect to frontend with token in query parameter
            return res.redirect(
                `${frontendUrl}/auth/success?token=${result.access_token}`
            )
        } catch (error) {
            const frontendUrl =
                this.configService.get<string>('frontend.url') ||
                'http://localhost:5173'
            return res.redirect(
                `${frontendUrl}/auth/error?message=${encodeURIComponent(
                    error instanceof Error ? error.message : 'Authentication failed'
                )}`
            )
        }
    }
}
