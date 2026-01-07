import { Module } from '@nestjs/common'
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TablesService } from './tables.service'
import { TablesController } from './tables.controller'

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
    controllers: [TablesController],
    providers: [TablesService],
    exports: [TablesService],
})
export class TablesModule {}

