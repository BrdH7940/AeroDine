import { Module } from '@nestjs/common'
import { RestaurantsService } from './restaurants.service'
import { RestaurantsController } from './restaurants.controller'
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule],
    controllers: [RestaurantsController],
    providers: [RestaurantsService],
    exports: [RestaurantsService],
})
export class RestaurantsModule {}
