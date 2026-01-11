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

    @Get('payment-methods')
    @ApiOperation({
        summary: 'Get payment methods breakdown (Admin only)',
        description: 'Returns payment methods distribution with total amounts.',
    })
    @ApiResponse({
        status: 200,
        description: 'Payment methods breakdown',
    })
    async getPaymentMethodsBreakdown() {
        return this.reportsService.getPaymentMethodsBreakdown()
    }

    @Get('category-sales')
    @ApiOperation({
        summary: 'Get sales by category (Admin only)',
        description: 'Returns total sales grouped by category.',
    })
    @ApiResponse({
        status: 200,
        description: 'Category sales data',
    })
    async getCategorySales() {
        return this.reportsService.getCategorySales()
    }

    @Get('voided-items')
    @ApiOperation({
        summary: 'Get voided/cancelled items (Admin only)',
        description: 'Returns top 5 voided items with cancellation counts and loss amounts.',
    })
    @ApiResponse({
        status: 200,
        description: 'Voided items data',
    })
    async getVoidedItems() {
        return this.reportsService.getVoidedItems()
    }

    @Get('peak-hours')
    @ApiOperation({
        summary: 'Get peak hours analysis (Admin only)',
        description: 'Returns order count by hour of day (0-23).',
    })
    @ApiResponse({
        status: 200,
        description: 'Peak hours data',
    })
    async getPeakHours() {
        return this.reportsService.getPeakHours()
    }

    @Get('day-of-week-revenue')
    @ApiOperation({
        summary: 'Get revenue by day of week (Admin only)',
        description: 'Returns total revenue grouped by day of week (Mon-Sun).',
    })
    @ApiResponse({
        status: 200,
        description: 'Day of week revenue data',
    })
    async getDayOfWeekRevenue() {
        return this.reportsService.getDayOfWeekRevenue()
    }

    @Get('menu-performance')
    @ApiOperation({
        summary: 'Get menu performance matrix (Admin only)',
        description: 'Returns menu items with quantity sold and total revenue for performance analysis.',
    })
    @ApiResponse({
        status: 200,
        description: 'Menu performance data',
    })
    async getMenuPerformance() {
        return this.reportsService.getMenuPerformance()
    }

    @Get('top-modifiers')
    @ApiOperation({
        summary: 'Get top modifiers (Admin only)',
        description: 'Returns top 8 most used modifiers.',
    })
    @ApiResponse({
        status: 200,
        description: 'Top modifiers data',
    })
    async getTopModifiers() {
        return this.reportsService.getTopModifiers()
    }

    @Get('rating-volume')
    @ApiOperation({
        summary: 'Get rating vs volume data (Admin only)',
        description: 'Returns top menu items with average ratings and sales volume.',
    })
    @ApiResponse({
        status: 200,
        description: 'Rating vs volume data',
    })
    async getRatingVolume() {
        return this.reportsService.getRatingVolume()
    }

    @Get('prep-time-trends')
    @ApiOperation({
        summary: 'Get prep time trends (Admin only)',
        description: 'Returns average prep time by week for the last 12 weeks.',
    })
    @ApiResponse({
        status: 200,
        description: 'Prep time trends data',
    })
    async getPrepTimeTrends() {
        return this.reportsService.getPrepTimeTrends()
    }
}
