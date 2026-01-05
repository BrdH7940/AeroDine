import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MenusModule } from './menus/menus.module';
import { OrdersModule } from './orders/orders.module';
import { SocketGateway } from './socket/socket.gateway';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    AuthModule,
    UsersModule,
    MenusModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService, SocketGateway],
})
export class AppModule {}
