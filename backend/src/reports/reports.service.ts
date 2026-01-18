import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { TableStatus, OrderStatus, PaymentMethod, OrderItemStatus } from '@aerodine/shared-types'

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
     * Helper method to calculate date range based on range string
     */
    private getDateRange(range: string): { startDate: Date; endDate: Date } {
        const endDate = new Date()
        endDate.setHours(23, 59, 59, 999) // End of today

        const startDate = new Date(endDate)

        switch (range) {
            case 'week':
                startDate.setDate(startDate.getDate() - 6) // 7 days including today
                break
            case '30':
            case 'month':
                startDate.setDate(startDate.getDate() - 29) // 30 days including today
                break
            case 'lastMonth': {
                // First day of last month
                startDate.setMonth(startDate.getMonth() - 1)
                startDate.setDate(1)
                // Last day of last month
                const lastDayOfLastMonth = new Date(endDate)
                lastDayOfLastMonth.setDate(0) // Last day of previous month
                lastDayOfLastMonth.setHours(23, 59, 59, 999)
                return { startDate, endDate: lastDayOfLastMonth }
            }
            case '3months':
                startDate.setMonth(startDate.getMonth() - 2) // 3 months including current month
                startDate.setDate(1) // First day of the month
                break
            default:
                // Default to 30 days
                startDate.setDate(startDate.getDate() - 29)
        }

        startDate.setHours(0, 0, 0, 0)
        return { startDate, endDate }
    }

    /**
     * Get revenue chart data for Chart.js
     * @param range - 'week', '30', 'month', 'lastMonth', or '3months'
     */
    async getRevenueChart(range: string = 'week') {
        const { startDate, endDate } = this.getDateRange(range)

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
        const endDateOnly = new Date(endDate)
        endDateOnly.setHours(0, 0, 0, 0)
        
        while (currentDate <= endDateOnly) {
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

    /**
     * Get payment methods breakdown
     */
    async getPaymentMethodsBreakdown() {
        // Get all successful payments from completed orders
        const payments = await this.prisma.payment.findMany({
            where: {
                status: 'SUCCESS',
                order: {
                    status: OrderStatus.COMPLETED,
                },
            },
            select: {
                method: true,
                amount: true,
            },
        })

        // Group by payment method and sum amounts
        const breakdown = new Map<PaymentMethod, number>()
        
        // Initialize all methods with 0
        Object.values(PaymentMethod).forEach((method) => {
            breakdown.set(method, 0)
        })

        payments.forEach((payment) => {
            // Convert Prisma enum to shared-types enum
            const method = payment.method as PaymentMethod
            const current = breakdown.get(method) || 0
            breakdown.set(method, current + Number(payment.amount))
        })

        // Convert to array format
        const result = Array.from(breakdown.entries()).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2)),
        }))

        // Filter out methods with 0 value
        return result.filter((item) => item.value > 0)
    }

    /**
     * Get sales by category
     */
    async getCategorySales() {
        // Get all order items from completed orders with category info
        const orderItems = await this.prisma.orderItem.findMany({
            where: {
                order: {
                    status: OrderStatus.COMPLETED,
                },
            },
            select: {
                quantity: true,
                pricePerUnit: true,
                menuItem: {
                    select: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        })

        // Group by category and sum sales
        const categorySales = new Map<string, number>()

        orderItems.forEach((item) => {
            const categoryName = item.menuItem.category.name
            const itemTotal = Number(item.pricePerUnit) * item.quantity
            const current = categorySales.get(categoryName) || 0
            categorySales.set(categoryName, current + itemTotal)
        })

        // Convert to array format and sort by sales descending
        const result = Array.from(categorySales.entries())
            .map(([category, sales]) => ({
                category,
                sales: Number(sales.toFixed(2)),
            }))
            .sort((a, b) => b.sales - a.sales)

        return result
    }

    /**
     * Get voided/cancelled items
     */
    async getVoidedItems() {
        // Get cancelled order items
        const voidedItems = await this.prisma.orderItem.findMany({
            where: {
                status: OrderItemStatus.CANCELLED,
            },
            select: {
                id: true,
                name: true,
                quantity: true,
                pricePerUnit: true,
                order: {
                    select: {
                        status: true,
                    },
                },
            },
        })

        // Group by item name and calculate totals
        const itemMap = new Map<
            string,
            { timesVoided: number; lossAmount: number; reason: string }
        >()

        voidedItems.forEach((item) => {
            const itemName = item.name
            const lossAmount = Number(item.pricePerUnit) * item.quantity
            const current = itemMap.get(itemName) || {
                timesVoided: 0,
                lossAmount: 0,
                reason: 'Customer Cancelled', // Default reason
            }
            itemMap.set(itemName, {
                timesVoided: current.timesVoided + 1,
                lossAmount: current.lossAmount + lossAmount,
                reason: current.reason, // In real implementation, you might track reasons separately
            })
        })

        // Convert to array and sort by loss amount descending, take top 5
        const result = Array.from(itemMap.entries())
            .map(([itemName, data]) => ({
                itemName,
                timesVoided: data.timesVoided,
                lossAmount: Number(data.lossAmount.toFixed(2)),
                reason: data.reason,
            }))
            .sort((a, b) => b.lossAmount - a.lossAmount)
            .slice(0, 5)

        return result
    }

    /**
     * Get peak hours analysis
     */
    async getPeakHours() {
        // Get all orders with creation time
        const orders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.COMPLETED,
            },
            select: {
                createdAt: true,
            },
        })

        // Group by hour (0-23)
        const hourCounts = new Map<number, number>()

        // Initialize all hours with 0
        for (let hour = 0; hour < 24; hour++) {
            hourCounts.set(hour, 0)
        }

        orders.forEach((order) => {
            const hour = new Date(order.createdAt).getHours()
            const current = hourCounts.get(hour) || 0
            hourCounts.set(hour, current + 1)
        })

        // Convert to array format with formatted hour strings
        const result = Array.from(hourCounts.entries())
            .map(([hour, orders]) => ({
                hour: `${String(hour).padStart(2, '0')}:00`,
                orders,
            }))
            .sort((a, b) => {
                const hourA = parseInt(a.hour.split(':')[0])
                const hourB = parseInt(b.hour.split(':')[0])
                return hourA - hourB
            })

        return result
    }

    /**
     * Get revenue by day of week
     */
    async getDayOfWeekRevenue() {
        // Get all completed orders
        const orders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.COMPLETED,
            },
            select: {
                totalAmount: true,
                createdAt: true,
            },
        })

        // Day names mapping
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const dayRevenue = new Map<number, number>()

        // Initialize all days with 0
        for (let day = 0; day < 7; day++) {
            dayRevenue.set(day, 0)
        }

        orders.forEach((order) => {
            const dayOfWeek = new Date(order.createdAt).getDay()
            const current = dayRevenue.get(dayOfWeek) || 0
            dayRevenue.set(dayOfWeek, current + Number(order.totalAmount))
        })

        // Convert to array format, starting with Monday (1)
        // Rearrange: Mon=0, Tue=1, ..., Sun=6
        const result: Array<{ day: string; revenue: number }> = []
        for (let i = 1; i <= 6; i++) {
            result.push({
                day: dayNames[i],
                revenue: Number((dayRevenue.get(i) || 0).toFixed(2)),
            })
        }
        // Add Sunday at the end
        result.push({
            day: dayNames[0],
            revenue: Number((dayRevenue.get(0) || 0).toFixed(2)),
        })

        return result
    }

    /**
     * Get menu performance matrix (quantity sold vs revenue)
     */
    async getMenuPerformance() {
        // Get all order items from completed orders
        const orderItems = await this.prisma.orderItem.findMany({
            where: {
                order: {
                    status: OrderStatus.COMPLETED,
                },
            },
            select: {
                menuItemId: true,
                quantity: true,
                pricePerUnit: true,
                menuItem: {
                    select: {
                        name: true,
                    },
                },
            },
        })

        // Group by menu item
        const itemMap = new Map<
            number,
            { name: string; quantitySold: number; totalRevenue: number }
        >()

        orderItems.forEach((item) => {
            const menuItemId = item.menuItemId
            const quantity = item.quantity
            const revenue = Number(item.pricePerUnit) * quantity

            const current = itemMap.get(menuItemId) || {
                name: item.menuItem.name,
                quantitySold: 0,
                totalRevenue: 0,
            }

            itemMap.set(menuItemId, {
                name: current.name,
                quantitySold: current.quantitySold + quantity,
                totalRevenue: current.totalRevenue + revenue,
            })
        })

        // Convert to array format
        const result = Array.from(itemMap.values()).map((item) => ({
            name: item.name,
            quantitySold: item.quantitySold,
            totalRevenue: Number(item.totalRevenue.toFixed(2)),
        }))

        return result
    }

    /**
     * Get top modifiers
     */
    async getTopModifiers() {
        // Get all order item modifiers
        const modifiers = await this.prisma.orderItemModifier.findMany({
            where: {
                orderItem: {
                    order: {
                        status: OrderStatus.COMPLETED,
                    },
                },
            },
            select: {
                modifierName: true,
            },
        })

        // Count usage of each modifier
        const modifierCounts = new Map<string, number>()

        modifiers.forEach((modifier) => {
            const name = modifier.modifierName
            const current = modifierCounts.get(name) || 0
            modifierCounts.set(name, current + 1)
        })

        // Convert to array, sort by usage, take top 8
        const result = Array.from(modifierCounts.entries())
            .map(([name, usage]) => ({
                name,
                usage,
            }))
            .sort((a, b) => b.usage - a.usage)
            .slice(0, 8)

        return result
    }

    /**
     * Get rating vs volume data (menu items with ratings and sales volume)
     */
    async getRatingVolume() {
        // Get all order items from completed orders with menu item info
        const orderItems = await this.prisma.orderItem.findMany({
            where: {
                order: {
                    status: OrderStatus.COMPLETED,
                },
            },
            select: {
                menuItemId: true,
                quantity: true,
                menuItem: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        // Calculate sales volume by menu item
        const volumeMap = new Map<number, number>()
        const nameMap = new Map<number, string>()
        
        orderItems.forEach((item) => {
            const menuItemId = item.menuItemId
            nameMap.set(menuItemId, item.menuItem.name)
            const current = volumeMap.get(menuItemId) || 0
            volumeMap.set(menuItemId, current + item.quantity)
        })

        // Get all reviews with ratings
        const reviews = await this.prisma.review.findMany({
            select: {
                menuItemId: true,
                rating: true,
            },
        })

        // Calculate average rating by menu item
        const ratingMap = new Map<number, { total: number; count: number }>()
        reviews.forEach((review) => {
            const current = ratingMap.get(review.menuItemId) || {
                total: 0,
                count: 0,
            }
            ratingMap.set(review.menuItemId, {
                total: current.total + review.rating,
                count: current.count + 1,
            })
        })

        // Combine volume and ratings
        const result: Array<{ item: string; rating: number; volume: number }> = []
        
        volumeMap.forEach((volume, menuItemId) => {
            const ratingData = ratingMap.get(menuItemId)
            if (ratingData && ratingData.count > 0) {
                const avgRating = ratingData.total / ratingData.count
                result.push({
                    item: nameMap.get(menuItemId) || 'Unknown',
                    rating: Number(avgRating.toFixed(1)),
                    volume,
                })
            }
        })

        // Sort by volume descending and take top 5
        return result
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5)
    }

    /**
     * Get prep time trends (average prep time by week)
     * Calculates from OrderItem timestamps (createdAt to updatedAt when status = READY)
     */
    async getPrepTimeTrends() {
        // Get order items that have been prepared (status = READY or SERVED)
        const orderItems = await this.prisma.orderItem.findMany({
            where: {
                status: {
                    in: ['READY', 'SERVED'],
                },
                order: {
                    status: OrderStatus.COMPLETED,
                },
            },
            select: {
                createdAt: true,
                updatedAt: true,
                order: {
                    select: {
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // Calculate prep time for each item (time from created to updated)
        const prepTimes: Array<{ date: Date; prepTime: number }> = []
        orderItems.forEach((item) => {
            const prepTimeMs =
                new Date(item.updatedAt).getTime() -
                new Date(item.createdAt).getTime()
            const prepTimeMinutes = prepTimeMs / (1000 * 60)
            if (prepTimeMinutes > 0 && prepTimeMinutes < 120) {
                // Filter out unreasonable values
                prepTimes.push({
                    date: new Date(item.order.createdAt),
                    prepTime: prepTimeMinutes,
                })
            }
        })

        // Group by week (last 12 weeks)
        const now = new Date()
        const weeksData: Array<{ week: string; avgPrepTime: number }> = []
        
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(now)
            weekStart.setDate(weekStart.getDate() - (i * 7 + 6))
            weekStart.setHours(0, 0, 0, 0)
            
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 7)
            
            // Filter prep times for this week
            const weekPrepTimes = prepTimes
                .filter(
                    (pt) =>
                        pt.date >= weekStart &&
                        pt.date < weekEnd
                )
                .map((pt) => pt.prepTime)
            
            const avgPrepTime =
                weekPrepTimes.length > 0
                    ? weekPrepTimes.reduce((a, b) => a + b, 0) /
                      weekPrepTimes.length
                    : 0 // Return 0 if no data for this week
            
            weeksData.push({
                week: `Week ${12 - i}`,
                avgPrepTime: Number(avgPrepTime.toFixed(1)),
            })
        }

        return weeksData
    }
}
