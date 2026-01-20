import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { UserRole } from '@aerodine/shared-types'
import { UsersService } from '../../users/users.service'

export interface JwtPayload {
    sub: number
    email: string
    role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly usersService: UsersService
    ) {
        const secretOrKey = configService.get<string>('jwt.secret')
        if (!secretOrKey) {
            throw new Error('JWT secret is not configured')
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey,
        })
    }

    async validate(payload: JwtPayload) {
        if (!payload.sub || !payload.email || !payload.role) {
            throw new UnauthorizedException('Invalid token payload')
        }

        // Check if user exists and get current status
        let user
        try {
            user = await this.usersService.findById(payload.sub)
        } catch (error) {
            throw new UnauthorizedException('User not found or account is invalid')
        }

        // If user is inactive, downgrade role to CUSTOMER
        // This ensures inactive users can only access CUSTOMER-level endpoints
        const effectiveRole = user.isActive ? (payload.role as UserRole) : UserRole.CUSTOMER

        // Return full user data including avatar and fullName
        return {
            id: payload.sub,
            email: payload.email,
            role: effectiveRole,
            fullName: user.fullName,
            avatar: user.avatar,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }
    }
}
