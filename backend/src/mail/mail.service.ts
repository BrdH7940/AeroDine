import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import { User } from '@prisma/client'

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name)
    private transporter: nodemailer.Transporter | null = null

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('mail.host')
        const user = this.configService.get<string>('mail.user')
        const pass = this.configService.get<string>('mail.pass')

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host: host,
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: user,
                    pass: pass,
                },
            })
            this.logger.log('Mail service initialized')
        } else {
            this.logger.warn(
                'Mail configuration incomplete. Email sending will be disabled.'
            )
        }
    }

    /**
     * Send user confirmation email
     */
    async sendUserConfirmation(user: User, token: string): Promise<void> {
        if (!this.transporter) {
            this.logger.warn(
                'Mail transporter not configured. Skipping email send.'
            )
            return
        }

        const frontendUrl =
            this.configService.get<string>('frontend.url') ||
            'http://localhost:5173'
        const from = this.configService.get<string>('mail.from') || 'noreply@aerodine.com'
        const confirmationUrl = `${frontendUrl}/confirm?token=${token}`

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email - AeroDine</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2563eb; margin-top: 0;">Welcome to AeroDine! 🎉</h1>
        <p>Hi ${user.fullName},</p>
        <p>Thank you for registering with AeroDine. Please confirm your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" 
               style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Confirm Email Address
            </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${confirmationUrl}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} AeroDine. All rights reserved.</p>
    </div>
</body>
</html>
        `

        try {
            await this.transporter.sendMail({
                from: `"AeroDine" <${from}>`,
                to: user.email,
                subject: 'Confirm Your Email - AeroDine',
                html: html,
            })
            this.logger.log(`Confirmation email sent to ${user.email}`)
        } catch (error) {
            this.logger.error(
                `Failed to send confirmation email to ${user.email}:`,
                error
            )
            throw error
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordReset(user: User, token: string): Promise<void> {
        if (!this.transporter) {
            this.logger.warn(
                'Mail transporter not configured. Skipping email send.'
            )
            return
        }

        const frontendUrl =
            this.configService.get<string>('frontend.url') ||
            'http://localhost:5173'
        const from = this.configService.get<string>('mail.from') || 'noreply@aerodine.com'
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - AeroDine</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #dc2626; margin-top: 0;">Password Reset Request</h1>
        <p>Hi ${user.fullName},</p>
        <p>We received a request to reset your password for your AeroDine account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 30px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Password
            </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
        <p style="color: #dc2626; font-size: 14px; margin-top: 30px; font-weight: bold;">This link will expire in 15 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p style="color: #666; font-size: 14px;">For security reasons, never share this link with anyone.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} AeroDine. All rights reserved.</p>
    </div>
</body>
</html>
        `

        try {
            await this.transporter.sendMail({
                from: `"AeroDine" <${from}>`,
                to: user.email,
                subject: 'Reset Your Password - AeroDine',
                html: html,
            })
            this.logger.log(`Password reset email sent to ${user.email}`)
        } catch (error) {
            this.logger.error(
                `Failed to send password reset email to ${user.email}:`,
                error
            )
            throw error
        }
    }
}
