import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

interface OtpData {
    code: string
    email: string
    userId: number
    expiresAt: Date
}

@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name)
    // In-memory storage for OTP codes
    // In production, consider using Redis or database
    private readonly otpStore = new Map<string, OtpData>()
    private readonly OTP_EXPIRATION_MINUTES = 10
    private readonly OTP_CODE_LENGTH = 6

    /**
     * Generate a 6-digit OTP code
     */
    generateOtpCode(): string {
        // Generate random 6-digit code
        const code = crypto.randomInt(100000, 999999).toString()
        return code
    }

    /**
     * Store OTP code with expiration
     */
    storeOtp(email: string, userId: number, code: string): void {
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRATION_MINUTES)

        // Remove any existing OTP for this email
        this.removeOtp(email)

        // Store new OTP
        const key = this.getOtpKey(email)
        this.otpStore.set(key, {
            code,
            email,
            userId,
            expiresAt,
        })

        this.logger.debug(`OTP stored for ${email}, expires at ${expiresAt}`)

        // Clean up expired OTPs periodically
        this.cleanupExpiredOtps()
    }

    /**
     * Verify OTP code
     */
    verifyOtp(email: string, code: string): { valid: boolean; userId?: number } {
        const key = this.getOtpKey(email)
        const otpData = this.otpStore.get(key)

        if (!otpData) {
            this.logger.warn(`OTP not found for ${email}`)
            return { valid: false }
        }

        // Check expiration
        if (new Date() > otpData.expiresAt) {
            this.logger.warn(`OTP expired for ${email}`)
            this.removeOtp(email)
            return { valid: false }
        }

        // Verify code (case-insensitive)
        if (otpData.code.toLowerCase() !== code.toLowerCase()) {
            this.logger.warn(`Invalid OTP code for ${email}`)
            return { valid: false }
        }

        // OTP is valid
        this.logger.debug(`OTP verified successfully for ${email}`)
        return { valid: true, userId: otpData.userId }
    }

    /**
     * Remove OTP for email (after successful use or expiration)
     */
    removeOtp(email: string): void {
        const key = this.getOtpKey(email)
        this.otpStore.delete(key)
    }

    /**
     * Get OTP key for email
     */
    private getOtpKey(email: string): string {
        return email.toLowerCase().trim()
    }

    /**
     * Clean up expired OTPs
     */
    private cleanupExpiredOtps(): void {
        const now = new Date()
        const keysToDelete: string[] = []

        for (const [key, otpData] of this.otpStore.entries()) {
            if (now > otpData.expiresAt) {
                keysToDelete.push(key)
            }
        }

        keysToDelete.forEach((key) => this.otpStore.delete(key))

        if (keysToDelete.length > 0) {
            this.logger.debug(`Cleaned up ${keysToDelete.length} expired OTPs`)
        }
    }
}
