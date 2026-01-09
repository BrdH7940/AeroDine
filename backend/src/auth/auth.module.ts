import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { UsersModule } from '../users/users.module'
import { MailModule } from '../mail/mail.module'
import { JwtStrategy } from './strategies/jwt.strategy'
import { GoogleStrategy } from './strategies/google.strategy'
import { RolesGuard } from './guards/roles.guard'

@Module({
    imports: [
        ConfigModule,
        UsersModule,
        MailModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): JwtModuleOptions => {
                const secret = configService.get<string>('jwt.secret')
                if (!secret) {
                    throw new Error('JWT secret not configured')
                }
                const expiresIn =
                    configService.get<string | number>('jwt.expiresIn') ?? '7d'
                return {
                    secret,
                    signOptions: { expiresIn: expiresIn as any },
                }
            },
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        GoogleStrategy,
        RolesGuard,
    ],
})
export class AuthModule {}
