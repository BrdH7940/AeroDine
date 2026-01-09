import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../../users/users.service'
import * as crypto from 'crypto'
import { UserRole } from '@aerodine/shared-types'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService
    ) {
        super({
            clientID: configService.get<string>('google.clientId') || '',
            clientSecret:
                configService.get<string>('google.clientSecret') || '',
            callbackURL: configService.get<string>('google.callbackUrl') || '',
            scope: ['email', 'profile'],
        })
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback
    ): Promise<any> {
        const { id, name, emails, photos } = profile

        // Extract user information from Google profile
        const email = emails?.[0]?.value
        const firstName = name?.givenName || ''
        const lastName = name?.familyName || ''
        const fullName =
            name?.displayName ||
            `${firstName} ${lastName}`.trim() ||
            email ||
            'User'
        const picture = photos?.[0]?.value

        if (!email) {
            return done(new Error('Email not provided by Google'), false)
        }

        try {
            // Check if user exists by email
            let user = await this.usersService.findByEmail(email)

            if (user) {
                // User exists, return it
                return done(null, user)
            } else {
                // User doesn't exist, create a new user
                // Generate a secure random password for Google accounts
                // Password won't be used since user logs in via Google OAuth
                const randomPassword = crypto.randomBytes(32).toString('hex')

                // Create new user with Google account
                // Default role is CUSTOMER (set in UsersService.create)
                const newUser = await this.usersService.create({
                    email,
                    fullName,
                    password: randomPassword, // This meets min 6 chars requirement
                    // role is optional and defaults to CUSTOMER in UsersService
                })

                return done(null, newUser)
            }
        } catch (error) {
            return done(error as Error, false)
        }
    }
}
