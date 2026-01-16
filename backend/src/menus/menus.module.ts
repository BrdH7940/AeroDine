import { Module } from '@nestjs/common'
import { MenusService } from './menus.service'
import { MenusController } from './menus.controller'
import { CloudinaryService } from '../common/cloudinary/cloudinary.service'

@Module({
    controllers: [MenusController],
    providers: [MenusService, CloudinaryService],
    exports: [MenusService],
})
export class MenusModule {}
