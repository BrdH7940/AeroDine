import {
    Controller,
    Get,
    Param,
    Patch,
    Body,
    UseGuards,
} from '@nestjs/common'
import { RestaurantsService } from './restaurants.service'
import { UpdateRestaurantDto } from './dto/update-restaurant.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@aerodine/shared-types'
import {
    ApiBearerAuth,
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger'

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
    constructor(private readonly restaurantsService: RestaurantsService) {}

    @Get()
    @ApiOperation({
        summary: 'Get all restaurants',
        description: 'Returns a list of all restaurants',
    })
    @ApiResponse({ status: 200, description: 'List of restaurants' })
    findAll() {
        return this.restaurantsService.findAll()
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get restaurant by ID',
        description: 'Returns restaurant details by ID',
    })
    @ApiParam({ name: 'id', type: 'number', description: 'Restaurant ID' })
    @ApiResponse({ status: 200, description: 'Restaurant details' })
    @ApiResponse({ status: 404, description: 'Restaurant not found' })
    findOne(@Param('id') id: string) {
        return this.restaurantsService.findOne(+id)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch(':id')
    @ApiOperation({
        summary: 'Update restaurant (ADMIN only)',
        description: 'Update restaurant information such as name, address, and active status',
    })
    @ApiParam({ name: 'id', type: 'number', description: 'Restaurant ID' })
    @ApiResponse({ status: 200, description: 'Restaurant updated successfully' })
    @ApiResponse({ status: 404, description: 'Restaurant not found' })
    update(@Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
        return this.restaurantsService.update(+id, dto)
    }
}
