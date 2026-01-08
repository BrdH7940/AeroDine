import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';

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
  controllers: [MenusController],
  providers: [
    MenusService,
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
  exports: [MenusService],
})
export class MenusModule {}
