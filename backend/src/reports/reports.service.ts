import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { TableStatus, OrderStatus } from '@aerodine/shared-types'

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get dashboard statistics for today
     */
    async getDashboardStats() {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Total Revenue (Today) - Sum of completed orders
        const revenueResult = await this.prisma.order.aggregate({
            where: {
                status: OrderStatus.COMPLETED,
                createdAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            _sum: {
                totalAmount: true,
            },
        })

        const totalRevenue = revenueResult._sum.totalAmount
            ? Number(revenueResult._sum.totalAmount)
            : 0

        // Total Orders (Today) - Count all orders created today
        const totalOrders = await this.prisma.order.count({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        })

        // Active Tables (Status != AVAILABLE)
        const activeTables = await this.prisma.table.count({
            where: {
                status: {
                    not: TableStatus.AVAILABLE,
                },
                isActive: true,
            },
        })

        return {
            totalRevenue,
            totalOrders,
            activeTables,
        }
    }

    /**
     * Get revenue chart data for Chart.js
     * @param range - 'week' or 'month'
     */
    async getRevenueChart(range: 'week' | 'month') {
        const endDate = new Date()
        endDate.setHours(23, 59, 59, 999) // End of today

        let startDate: Date
        if (range === 'week') {
            startDate = new Date(endDate)
            startDate.setDate(startDate.getDate() - 6) // 7 days including today
            startDate.setHours(0, 0, 0, 0)
        } else {
            // month (last 30 days including today)
            startDate = new Date(endDate)
            startDate.setDate(startDate.getDate() - 29) // 30 days including today
            startDate.setHours(0, 0, 0, 0)
        }

        // Get all completed orders in the date range
        const orders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.COMPLETED,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                totalAmount: true,
                createdAt: true,
            },
        })

        // Group by date and sum revenue
        const revenueByDate = new Map<string, number>()

        // Initialize all dates in range with 0
        const dateArray: Date[] = []
        const currentDate = new Date(startDate)
        const todayDateOnly = new Date(endDate)
        todayDateOnly.setHours(0, 0, 0, 0)
        
        while (currentDate <= todayDateOnly) {
            dateArray.push(new Date(currentDate))
            const dateKey = currentDate.toISOString().split('T')[0]
            revenueByDate.set(dateKey, 0)
            currentDate.setDate(currentDate.getDate() + 1)
        }

        // Sum revenue by date
        orders.forEach((order) => {
            const dateKey = order.createdAt.toISOString().split('T')[0]
            const currentAmount = revenueByDate.get(dateKey) || 0
            revenueByDate.set(
                dateKey,
                currentAmount + Number(order.totalAmount)
            )
        })

        // Format for Chart.js: labels (dates) and data (revenue)
        const labels: string[] = []
        const data: number[] = []

        dateArray.forEach((date) => {
            const dateKey = date.toISOString().split('T')[0]
            // Format date as MM/DD for display
            const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
            labels.push(formattedDate)
            data.push(revenueByDate.get(dateKey) || 0)
        })

        return {
            labels,
            data,
        }
    }

    /**
     * Get top 5 selling menu items
     */
    async getTopSellingItems() {
        // Group OrderItem by menuItemId and sum quantities
        const topItems = await this.prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: {
                // Only count items from completed orders
                order: {
                    status: OrderStatus.COMPLETED,
                },
            },
            _sum: {
                quantity: true,
            },
            orderBy: {
                _sum: {
                    quantity: 'desc',
                },
            },
            take: 5,
        })

        // Fetch menu item details for each top item
        const menuItemIds = topItems.map((item) => item.menuItemId)
        const menuItems = await this.prisma.menuItem.findMany({
            where: {
                id: {
                    in: menuItemIds,
                },
            },
            select: {
                id: true,
                name: true,
                basePrice: true,
            },
        })

        // Combine data and maintain order
        const result = topItems.map((item) => {
            const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)
            return {
                menuItemId: item.menuItemId,
                menuItemName: menuItem?.name || 'Unknown',
                basePrice: menuItem?.basePrice
                    ? Number(menuItem.basePrice)
                    : 0,
                totalQuantity: item._sum.quantity || 0,
            }
        })

        return result
    }
}
