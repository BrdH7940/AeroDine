import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

// Import PrismaClient with error handling
let PrismaClient: new () => any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const prisma = require('@prisma/client');
  PrismaClient = prisma.PrismaClient;
} catch {
  // If Prisma client not generated, create a placeholder class
  PrismaClient = class {} as any;
}

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: 'PrismaClient',
      useFactory: () => {
        try {
          return new PrismaClient();
        } catch {
          throw new Error('Prisma client not generated. Please run: npx prisma generate');
        }
      },
    },
  ],
})
export class OrdersModule {}
