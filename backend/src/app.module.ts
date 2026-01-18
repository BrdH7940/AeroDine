import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { MenusModule } from './menus/menus.module'
import { OrdersModule } from './orders/orders.module'
import { TablesModule } from './tables/tables.module'
import { RestaurantsModule } from './restaurants/restaurants.module'
import { PaymentsModule } from './payments/payments.module'
import { ReportsModule } from './reports/reports.module'
import { SocketModule } from './socket/socket.module'
import { DatabaseModule } from './database/database.module'
import { CloudinaryModule } from './cloudinary/cloudinary.module'
import configuration from './config/configuration'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
            envFilePath: ['.env.local', '.env'],
        }),
        // Rate limiting configuration
        // Limit: 10 requests per minute per IP for order creation
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 60000, // 1 minute
                limit: 10, // 10 requests per minute
            },
            {
                name: 'medium',
                ttl: 600000, // 10 minutes
                limit: 50, // 50 requests per 10 minutes
            },
        ]),
        DatabaseModule,
        SocketModule,
        AuthModule,
        UsersModule,
        MenusModule,
        OrdersModule,
        TablesModule,
        RestaurantsModule,
        PaymentsModule,
        ReportsModule,
        CloudinaryModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // Apply throttler guard globally (can be overridden per route)
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
