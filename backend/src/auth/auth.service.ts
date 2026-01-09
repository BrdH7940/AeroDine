import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { RegisterDto } from './dto/create-auth.dto'
import { LoginDto } from './dto/update-auth.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UsersService } from '../users/users.service'
import { MailService } from '../mail/mail.service'
import { UserRole } from '@prisma/client'

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name)

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService
    ) {}

    async register(registerDto: RegisterDto) {
        const existing = await this.usersService.findByEmail(registerDto.email)
        if (existing) {
            throw new ConflictException('Email already registered')
        }

        const user = await this.usersService.create(registerDto)
        const token = await this.signToken(user.id, user.email, user.role)
        return { access_token: token, user }
    }

    async login(loginDto: LoginDto) {
        const user = await this.usersService.findByEmail(loginDto.email)
        if (!user) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const isValid = await bcrypt.compare(
            loginDto.password,
            user.passwordHash
        )
        if (!isValid) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const token = await this.signToken(user.id, user.email, user.role)
        const { passwordHash, refreshToken, ...userSafe } = user
        return { access_token: token, user: userSafe }
    }

    private async signToken(userId: number, email: string, role: UserRole) {
        const payload = { sub: userId, email, role }
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }
        const expiresIn =
            this.configService.get<string | number>('jwt.expiresIn') ?? '7d'
        return this.jwtService.signAsync(payload, {
            secret,
            expiresIn: expiresIn as any,
        })
    }

    /**
     * Generate a temporary token for password reset
     */
    private async signPasswordResetToken(
        userId: number,
        email: string
    ): Promise<string> {
        const payload = { sub: userId, email, type: 'password_reset' }
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }
        // Token expires in 15 minutes
        return this.jwtService.signAsync(payload, {
            secret,
            expiresIn: '15m',
        })
    }

    /**
     * Send forgot password email
     */
    async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
        const user = await this.usersService.findByEmail(dto.email)

        // Don't reveal if email exists for security
        if (!user) {
            // Still return success message to prevent email enumeration
            return {
                message:
                    'If an account with that email exists, a password reset link has been sent.',
            }
        }

        try {
            // Generate password reset token
            const resetToken = await this.signPasswordResetToken(
                user.id,
                user.email
            )

            // Send password reset email
            // Wrap in try-catch to prevent email enumeration if sending fails
            await this.mailService.sendPasswordReset(user, resetToken)
        } catch (error) {
            // Log error but don't reveal to user to prevent email enumeration
            this.logger.error(
                `Failed to send password reset email to ${dto.email}:`,
                error
            )
        }

        // Always return success message to prevent email enumeration
        return {
            message:
                'If an account with that email exists, a password reset link has been sent.',
        }
    }

    /**
     * Reset password using token
     */
    async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }

        // Verify token
        let decoded: any
        try {
            decoded = await this.jwtService.verifyAsync(dto.token, { secret })
        } catch (error) {
            throw new BadRequestException('Invalid or expired reset token')
        }

        // Verify token type
        if (decoded.type !== 'password_reset') {
            throw new BadRequestException('Invalid token type')
        }

        // Find user
        const user = await this.usersService.findByEmail(decoded.email)
        if (!user) {
            throw new NotFoundException('User not found')
        }

        // Verify user ID matches
        if (user.id !== decoded.sub) {
            throw new BadRequestException('Token does not match user')
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(dto.newPassword, 10)

        // Update user password
        await this.usersService.updatePassword(user.id, passwordHash)

        return {
            message: 'Password has been reset successfully',
        }
    }
}
