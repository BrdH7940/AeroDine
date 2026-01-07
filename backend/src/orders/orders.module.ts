import { Module } from '@nestjs/common'
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'

@Module({
    imports: [
        ConfigModule,
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
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule {}
