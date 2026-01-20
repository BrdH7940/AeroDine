import {
    Controller,
    Get,
    Query,
    UseGuards,
    ParseEnumPipe,
    HttpException,
    HttpStatus,
    Logger,
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
    private readonly logger = new Logger(ReportsController.name)
    
    constructor(private readonly reportsService: ReportsService) {}

    /**
     * Helper method to handle errors from service methods
     */
    private handleError(error: any, methodName: string) {
        this.logger.error(`Error in ${methodName}:`, error)
        
        // Handle Prisma connection errors
        if (error.code === 'P1017') {
            throw new HttpException(
                {
                    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'Database connection error. Please try again later.',
                    error: 'Service Unavailable',
                },
                HttpStatus.SERVICE_UNAVAILABLE
            )
        }
        
        // Handle other errors
        throw new HttpException(
            {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message || `Failed to fetch ${methodName}`,
                error: 'Internal Server Error',
            },
            HttpStatus.INTERNAL_SERVER_ERROR
        )
    }

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
        try {
            return await this.reportsService.getDashboardStats()
        } catch (error: any) {
            this.handleError(error, 'dashboard stats')
        }
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
        enum: ['week', '30', 'month', 'lastMonth', '3months'],
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
        @Query('range') range?: string
    ) {
        try {
            return await this.reportsService.getRevenueChart(range || 'week')
        } catch (error: any) {
            this.handleError(error, 'revenue chart')
        }
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
        try {
            return await this.reportsService.getTopSellingItems()
        } catch (error: any) {
            this.handleError(error, 'top selling items')
        }
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
        try {
            return await this.reportsService.getPaymentMethodsBreakdown()
        } catch (error: any) {
            this.handleError(error, 'payment methods breakdown')
        }
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
        try {
            return await this.reportsService.getCategorySales()
        } catch (error: any) {
            this.handleError(error, 'category sales')
        }
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
        try {
            return await this.reportsService.getVoidedItems()
        } catch (error: any) {
            this.handleError(error, 'voided items')
        }
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
        try {
            return await this.reportsService.getPeakHours()
        } catch (error: any) {
            this.handleError(error, 'peak hours')
        }
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
        try {
            return await this.reportsService.getDayOfWeekRevenue()
        } catch (error: any) {
            this.handleError(error, 'day of week revenue')
        }
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
        try {
            return await this.reportsService.getMenuPerformance()
        } catch (error: any) {
            this.handleError(error, 'menu performance')
        }
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
        try {
            return await this.reportsService.getTopModifiers()
        } catch (error: any) {
            this.handleError(error, 'top modifiers')
        }
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
        try {
            return await this.reportsService.getRatingVolume()
        } catch (error: any) {
            this.handleError(error, 'rating volume')
        }
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
    @ApiResponse({
        status: 500,
        description: 'Database connection error',
    })
    async getPrepTimeTrends() {
        try {
            return await this.reportsService.getPrepTimeTrends()
        } catch (error: any) {
            this.handleError(error, 'prep time trends')
        }
    }
}
