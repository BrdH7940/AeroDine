import {
    Controller,
    Get,
    Query,
    UseGuards,
    ParseEnumPipe,
} from '@nestjs/common'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@aerodine/shared-types'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger'

@ApiTags('reports')
@Controller('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('stats')
    @ApiOperation({
        summary: 'Get dashboard statistics (Admin only)',
        description:
            'Returns today\'s total revenue, total orders, and active tables count.',
    })
    @ApiResponse({
        status: 200,
        description: 'Dashboard statistics',
        schema: {
            example: {
                totalRevenue: 1250000,
                totalOrders: 45,
                activeTables: 12,
            },
        },
    })
    async getDashboardStats() {
        return this.reportsService.getDashboardStats()
    }

    @Get('revenue')
    @ApiOperation({
        summary: 'Get revenue chart data (Admin only)',
        description:
            'Returns revenue chart data formatted for Chart.js with labels (dates) and data (revenue sums).',
    })
    @ApiQuery({
        name: 'range',
        required: false,
        enum: ['week', 'month'],
        description: 'Time range for revenue chart',
        example: 'week',
    })
    @ApiResponse({
        status: 200,
        description: 'Revenue chart data',
        schema: {
            example: {
                labels: ['12/1', '12/2', '12/3', '12/4', '12/5', '12/6', '12/7'],
                data: [500000, 750000, 600000, 900000, 850000, 700000, 800000],
            },
        },
    })
    async getRevenueChart(
        @Query(
            'range',
            new ParseEnumPipe(['week', 'month'], {
                optional: true,
            })
        )
        range?: 'week' | 'month'
    ) {
        return this.reportsService.getRevenueChart(range || 'week')
    }

    @Get('top-items')
    @ApiOperation({
        summary: 'Get top selling menu items (Admin only)',
        description:
            'Returns top 5 selling menu items based on total quantity sold from completed orders.',
    })
    @ApiResponse({
        status: 200,
        description: 'Top selling items',
        schema: {
            example: {
                menuItemId: 1,
                menuItemName: 'Pho Bo',
                basePrice: 75000,
                totalQuantity: 150,
            },
        },
    })
    async getTopSellingItems() {
        return this.reportsService.getTopSellingItems()
    }
}
