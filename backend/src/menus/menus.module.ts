import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';

// Import PrismaClient with error handling
let PrismaClient: new () => any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const prisma = require('@prisma/client');
  PrismaClient = prisma.PrismaClient;
} catch (error) {
  console.error('Failed to import Prisma client:', error);
  console.error('Please run: cd backend && npx prisma generate');
  // If Prisma client not generated, create a placeholder class
  // If Prisma client not generated, create a placeholder class
  PrismaClient = class {} as any;
}

@Module({
  controllers: [MenusController],
  providers: [
    MenusService,
    {
      provide: 'PrismaClient',
      useFactory: () => {
        try {
          if (!PrismaClient || PrismaClient.toString().includes('placeholder')) {
            throw new Error('Prisma client not available');
          }
          const client = new PrismaClient();
          return client;
        } catch (error) {
          console.error('Failed to create Prisma client:', error);
          throw new Error(
            `Prisma client initialization failed. Please ensure:\n` +
            `1. Prisma client is generated: cd backend && npx prisma generate\n` +
            `2. Database connection is configured in .env file\n` +
            `3. Migrations are run: cd backend && npx prisma migrate deploy\n` +
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    },
  ],
  exports: [MenusService],
})
export class MenusModule {}
