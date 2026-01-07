import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { UserRole } from '@aerodine/shared-types'

export interface JwtPayload {
    sub: number
    email: string
    role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.secret'),
        })
    }

    async validate(payload: JwtPayload) {
        if (!payload.sub || !payload.email || !payload.role) {
            throw new UnauthorizedException('Invalid token payload')
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role as UserRole,
        }
    }
}
