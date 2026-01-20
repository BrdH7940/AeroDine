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
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { ResetPasswordWithOtpDto } from './dto/reset-password-with-otp.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { UsersService } from '../users/users.service'
import { CreateUserDto } from '../users/dto/create-user.dto'
import { MailService } from '../mail/mail.service'
import { OtpService } from './otp.service'
import { UserRole } from '@aerodine/shared-types'
import { UserRole as PrismaUserRole } from '@prisma/client'

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name)

    /**
     * Convert Prisma UserRole to shared-types UserRole
     * Both enums have the same string values, so we can safely convert
     */
    private toSharedUserRole(role: PrismaUserRole | UserRole): UserRole {
        return role as UserRole
    }

    /**
     * Get effective role for user (downgrade to CUSTOMER if inactive)
     */
    private getEffectiveRole(user: { isActive: boolean; role: PrismaUserRole | UserRole }): UserRole {
        return user.isActive 
            ? this.toSharedUserRole(user.role) 
            : UserRole.CUSTOMER
    }

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
        private readonly otpService: OtpService
    ) {}

    async register(registerDto: RegisterDto) {
        const existing = await this.usersService.findByEmail(registerDto.email)
        if (existing) {
            throw new ConflictException('Email already registered')
        }

        // Force CUSTOMER role for all registrations - role selection removed for security
        // Only ADMIN can create users with other roles via /users endpoint
        const createUserDto: CreateUserDto = {
            email: registerDto.email,
            password: registerDto.password,
            fullName: registerDto.fullName,
            role: UserRole.CUSTOMER,
        }
        const user = await this.usersService.create(createUserDto)
        const { accessToken, refreshToken } = await this.generateTokens(
            user.id,
            user.email,
            this.toSharedUserRole(user.role)
        )
        // Store refresh token in database
        await this.usersService.updateRefreshToken(user.id, refreshToken)
        return { access_token: accessToken, refresh_token: refreshToken, user }
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

        // Get effective role (downgrade to CUSTOMER if inactive)
        const effectiveRole = this.getEffectiveRole(user)

        const { accessToken, refreshToken } = await this.generateTokens(
            user.id,
            user.email,
            effectiveRole
        )
        // Store refresh token in database
        await this.usersService.updateRefreshToken(user.id, refreshToken)
        const { passwordHash, refreshToken: _, ...userSafe } = user
        // Return user with effective role (CUSTOMER if inactive)
        return { 
            access_token: accessToken, 
            refresh_token: refreshToken, 
            user: { ...userSafe, role: effectiveRole } 
        }
    }

    /**
     * Generate JWT token for Google OAuth user
     */
    async googleLogin(user: any) {
        if (!user) {
            throw new UnauthorizedException('Google authentication failed')
        }

        // Find user to get full user object with role
        const fullUser = await this.usersService.findByEmail(user.email)
        if (!fullUser) {
            throw new NotFoundException('User not found after Google authentication')
        }

        // Get effective role (downgrade to CUSTOMER if inactive)
        const effectiveRole = this.getEffectiveRole(fullUser)

        const { accessToken, refreshToken } = await this.generateTokens(
            fullUser.id,
            fullUser.email,
            effectiveRole
        )
        // Store refresh token in database
        await this.usersService.updateRefreshToken(fullUser.id, refreshToken)

        const { passwordHash, refreshToken: _, ...userSafe } = fullUser
        // Return user with effective role (CUSTOMER if inactive)
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { ...userSafe, role: effectiveRole },
        }
    }

    /**
     * Generate both access token and refresh token
     */
    private async generateTokens(userId: number, email: string, role: UserRole) {
        const accessToken = await this.signAccessToken(userId, email, role)
        const refreshToken = await this.signRefreshToken(userId, email, role)
        return { accessToken, refreshToken }
    }

    /**
     * Sign short-lived access token (15 minutes default)
     */
    private async signAccessToken(userId: number, email: string, role: UserRole) {
        const payload = { sub: userId, email, role, type: 'access' }
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }
        const expiresIn =
            this.configService.get<string | number>('jwt.accessTokenExpiresIn') ??
            this.configService.get<string | number>('jwt.expiresIn') ??
            '15m'
        return this.jwtService.signAsync(payload, {
            secret,
            expiresIn: expiresIn as any,
        })
    }

    /**
     * Sign long-lived refresh token (7 days default)
     */
    private async signRefreshToken(userId: number, email: string, role: UserRole) {
        const payload = { sub: userId, email, role, type: 'refresh' }
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }
        const expiresIn =
            this.configService.get<string | number>('jwt.refreshTokenExpiresIn') ?? '7d'
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
     * Send forgot password email with OTP code
     */
    async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
        const user = await this.usersService.findByEmail(dto.email)

        // Don't reveal if email exists for security
        if (!user) {
            // Still return success message to prevent email enumeration
            return {
                message:
                    'If an account with that email exists, a verification code has been sent.',
            }
        }

        try {
            // Generate OTP code
            const otpCode = this.otpService.generateOtpCode()

            // Store OTP with expiration
            this.otpService.storeOtp(user.email, user.id, otpCode)

            // Send OTP code via email
            // Wrap in try-catch to prevent email enumeration if sending fails
            await this.mailService.sendPasswordResetOTP(user, otpCode)
        } catch (error) {
            // Log error but don't reveal to user to prevent email enumeration
            this.logger.error(
                `Failed to send password reset OTP to ${dto.email}:`,
                error
            )
        }

        // Always return success message to prevent email enumeration
        return {
            message:
                'If an account with that email exists, a verification code has been sent.',
        }
    }

    /**
     * Verify OTP code
     */
    async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string; verified: boolean }> {
        const user = await this.usersService.findByEmail(dto.email)

        // Don't reveal if email exists for security
        if (!user) {
            return {
                message: 'Invalid verification code',
                verified: false,
            }
        }

        // Verify OTP
        const result = this.otpService.verifyOtp(dto.email, dto.otpCode)

        if (!result.valid) {
            return {
                message: 'Invalid or expired verification code',
                verified: false,
            }
        }

        return {
            message: 'Verification code verified successfully',
            verified: true,
        }
    }

    /**
     * Reset password using OTP code
     */
    async resetPasswordWithOtp(
        dto: ResetPasswordWithOtpDto
    ): Promise<{ message: string }> {
        // Verify OTP first
        const otpResult = this.otpService.verifyOtp(dto.email, dto.otpCode)

        if (!otpResult.valid) {
            throw new BadRequestException('Invalid or expired verification code')
        }

        // Find user
        const user = await this.usersService.findByEmail(dto.email)
        if (!user) {
            throw new NotFoundException('User not found')
        }

        // Verify user ID matches
        if (user.id !== otpResult.userId) {
            throw new BadRequestException('Verification code does not match user')
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(dto.newPassword, 10)

        // Update user password
        await this.usersService.updatePassword(user.id, passwordHash)

        // Remove OTP after successful use
        this.otpService.removeOtp(dto.email)

        return {
            message: 'Password has been reset successfully',
        }
    }

    /**
     * Reset password using token (legacy method, deprecated - use resetPasswordWithOtp instead)
     * @deprecated Use resetPasswordWithOtp instead
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

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken: string) {
        const secret = this.configService.get<string>('jwt.secret')
        if (!secret) {
            throw new Error('JWT secret not configured')
        }

        // Verify refresh token
        let decoded: any
        try {
            decoded = await this.jwtService.verifyAsync(refreshToken, { secret })
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired refresh token')
        }

        // Verify token type
        if (decoded.type !== 'refresh') {
            throw new UnauthorizedException('Invalid token type')
        }

        // Verify refresh token exists in database
        const user = await this.usersService.findByRefreshToken(refreshToken)
        if (!user) {
            throw new UnauthorizedException('Refresh token not found')
        }

        // Verify user ID matches
        if (user.id !== decoded.sub) {
            throw new UnauthorizedException('Token does not match user')
        }

        // Get effective role (downgrade to CUSTOMER if inactive)
        const effectiveRole = this.getEffectiveRole(user)

        // Generate new access token with effective role
        const accessToken = await this.signAccessToken(user.id, user.email, effectiveRole)

        const { passwordHash, refreshToken: _, ...userSafe } = user
        // Return user with effective role (CUSTOMER if inactive)
        return {
            access_token: accessToken,
            user: { ...userSafe, role: effectiveRole },
        }
    }

    /**
     * Change password for logged-in user
     */
    async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
        // Find user
        const user = await this.usersService.findById(userId)
        if (!user) {
            throw new NotFoundException('User not found')
        }

        // Get full user with password hash
        const fullUser = await this.usersService.findByEmail(user.email)
        if (!fullUser) {
            throw new NotFoundException('User not found')
        }

        // Verify old password
        const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, fullUser.passwordHash)
        if (!isOldPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect')
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(dto.newPassword, 10)

        // Update user password
        await this.usersService.updatePassword(userId, passwordHash)

        return {
            message: 'Password has been changed successfully',
        }
    }

    /**
     * Logout - invalidate refresh token
     */
    async logout(userId: number): Promise<void> {
        // Clear refresh token from database
        await this.usersService.updateRefreshToken(userId, null)
    }
}
