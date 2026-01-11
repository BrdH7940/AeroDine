import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { MenusModule } from './menus/menus.module'
import { OrdersModule } from './orders/orders.module'
import { TablesModule } from './tables/tables.module'
import { PaymentsModule } from './payments/payments.module'
import { ReportsModule } from './reports/reports.module'
import { SocketModule } from './socket/socket.module'
import { DatabaseModule } from './database/database.module'
import configuration from './config/configuration'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
            envFilePath: ['.env.local', '.env'],
        }),
        DatabaseModule,
        SocketModule,
        AuthModule,
        UsersModule,
        MenusModule,
        OrdersModule,
        TablesModule,
        PaymentsModule,
        ReportsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
