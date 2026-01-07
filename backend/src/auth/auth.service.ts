import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { RegisterDto } from './dto/create-auth.dto'
import { LoginDto } from './dto/update-auth.dto'
import { UsersService } from '../users/users.service'
import { UserRole } from '@prisma/client'

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    async register(registerDto: RegisterDto) {
        const existing = await this.usersService.findByEmail(registerDto.email)
        if (existing) {
            throw new ConflictException('Email already registered')
        }

        const user = await this.usersService.create(registerDto)
        const token = await this.signToken(
            user.id,
            user.email,
            user.role,
            user.restaurantId
        )
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

        const token = await this.signToken(
            user.id,
            user.email,
            user.role,
            user.restaurantId
        )
        const { passwordHash, refreshToken, ...userSafe } = user
        return { access_token: token, user: userSafe }
    }

    private async signToken(
        userId: number,
        email: string,
        role: UserRole,
        restaurantId?: number | null
    ) {
        const payload = { sub: userId, email, role, restaurantId }
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
}
