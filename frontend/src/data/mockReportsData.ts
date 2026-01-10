// Mock data for Reports & Analytics Page

// Revenue Growth Trend Data (Area Chart)
export interface RevenueDataPoint {
    date: string
    revenue: number
    previousRevenue: number
}

export const revenueGrowthData: RevenueDataPoint[] = [
    { date: '2024-01-01', revenue: 12500, previousRevenue: 11800 },
    { date: '2024-01-08', revenue: 13800, previousRevenue: 12200 },
    { date: '2024-01-15', revenue: 15200, previousRevenue: 13500 },
    { date: '2024-01-22', revenue: 16800, previousRevenue: 14800 },
    { date: '2024-01-29', revenue: 17500, previousRevenue: 16200 },
    { date: '2024-02-05', revenue: 18900, previousRevenue: 17100 },
    { date: '2024-02-12', revenue: 20500, previousRevenue: 18500 },
    { date: '2024-02-19', revenue: 21800, previousRevenue: 19800 },
    { date: '2024-02-26', revenue: 23200, previousRevenue: 21000 },
    { date: '2024-03-05', revenue: 24500, previousRevenue: 22500 },
    { date: '2024-03-12', revenue: 25800, previousRevenue: 23800 },
    { date: '2024-03-19', revenue: 27200, previousRevenue: 25100 },
    { date: '2024-03-26', revenue: 28500, previousRevenue: 26400 },
    { date: '2024-04-02', revenue: 29800, previousRevenue: 27700 },
    { date: '2024-04-09', revenue: 31200, previousRevenue: 29000 },
    { date: '2024-04-16', revenue: 32500, previousRevenue: 30300 },
    { date: '2024-04-23', revenue: 33800, previousRevenue: 31600 },
    { date: '2024-04-30', revenue: 35200, previousRevenue: 32900 },
]

// Payment Methods Data (Donut Chart)
export interface PaymentMethodData {
    name: string
    value: number
    color: string
}

export const paymentMethodsData: PaymentMethodData[] = [
    { name: 'Card', value: 45280, color: '#0f172a' }, // slate-900
    { name: 'Cash', value: 18240, color: '#f59e0b' }, // amber-500
    { name: 'Digital Wallet', value: 12450, color: '#9ca3af' }, // gray-400
    { name: 'Other', value: 3030, color: '#64748b' }, // slate-500
]

// Financial Metrics
export interface FinancialMetrics {
    grossRevenue: number
    netProfit: number
    averageOrderValue: number
    totalOrders: number
}

export const financialMetrics: FinancialMetrics = {
    grossRevenue: 79000,
    netProfit: 23700, // 30% margin
    averageOrderValue: 45.5,
    totalOrders: 1736,
}

// Menu Performance Matrix Data (Scatter Plot)
export interface MenuItemPerformance {
    name: string
    quantitySold: number
    totalRevenue: number
}

export const menuPerformanceData: MenuItemPerformance[] = [
    { name: 'Grilled Salmon', quantitySold: 245, totalRevenue: 6122.55 },
    { name: 'Caesar Salad', quantitySold: 189, totalRevenue: 2362.5 },
    { name: 'Margherita Pizza', quantitySold: 312, totalRevenue: 5300.88 },
    { name: 'Chocolate Lava Cake', quantitySold: 156, totalRevenue: 1402.44 },
    { name: 'Beef Burger', quantitySold: 278, totalRevenue: 5143.0 },
    { name: 'Caprese Salad', quantitySold: 45, totalRevenue: 539.55 },
    { name: 'Pepperoni Pizza', quantitySold: 298, totalRevenue: 5958.02 },
    { name: 'Tiramisu', quantitySold: 134, totalRevenue: 1273.0 },
    { name: 'Chicken Pasta', quantitySold: 201, totalRevenue: 4218.99 },
    { name: 'Greek Salad', quantitySold: 167, totalRevenue: 2254.5 },
    { name: 'Fish & Chips', quantitySold: 123, totalRevenue: 2214.0 },
    { name: 'Vegetarian Wrap', quantitySold: 89, totalRevenue: 1157.0 },
    { name: 'Chicken Wings', quantitySold: 234, totalRevenue: 3510.0 },
    { name: 'Mushroom Risotto', quantitySold: 98, totalRevenue: 1960.0 },
    { name: 'Apple Pie', quantitySold: 67, totalRevenue: 536.0 },
]

// Sales by Category Data (Bar Chart)
export interface CategorySales {
    category: string
    sales: number
}

export const categorySalesData: CategorySales[] = [
    { category: 'Main Course', sales: 32450 },
    { category: 'Pizza', sales: 11258 },
    { category: 'Salads', sales: 5156 },
    { category: 'Desserts', sales: 3212 },
    { category: 'Drinks', sales: 18924 },
]

// Voided/Cancelled Items Data
export interface VoidedItem {
    itemName: string
    timesVoided: number
    lossAmount: number
    reason: string
}

export const voidedItemsData: VoidedItem[] = [
    {
        itemName: 'Grilled Salmon',
        timesVoided: 12,
        lossAmount: 299.88,
        reason: 'Out of Stock',
    },
    {
        itemName: 'Chocolate Lava Cake',
        timesVoided: 8,
        lossAmount: 71.92,
        reason: 'Kitchen Error',
    },
    {
        itemName: 'Margherita Pizza',
        timesVoided: 6,
        lossAmount: 101.94,
        reason: 'Customer Cancelled',
    },
    {
        itemName: 'Beef Burger',
        timesVoided: 5,
        lossAmount: 92.5,
        reason: 'Out of Stock',
    },
    {
        itemName: 'Tiramisu',
        timesVoided: 4,
        lossAmount: 38.0,
        reason: 'Kitchen Error',
    },
]

// Peak Hours Data (Bar Chart)
export interface PeakHourData {
    hour: string
    orders: number
}

export const peakHoursData: PeakHourData[] = [
    { hour: '00:00', orders: 2 },
    { hour: '01:00', orders: 1 },
    { hour: '02:00', orders: 0 },
    { hour: '03:00', orders: 0 },
    { hour: '04:00', orders: 0 },
    { hour: '05:00', orders: 0 },
    { hour: '06:00', orders: 3 },
    { hour: '07:00', orders: 8 },
    { hour: '08:00', orders: 15 },
    { hour: '09:00', orders: 22 },
    { hour: '10:00', orders: 34 },
    { hour: '11:00', orders: 48 },
    { hour: '12:00', orders: 67 },
    { hour: '13:00', orders: 72 },
    { hour: '14:00', orders: 58 },
    { hour: '15:00', orders: 45 },
    { hour: '16:00', orders: 38 },
    { hour: '17:00', orders: 52 },
    { hour: '18:00', orders: 89 },
    { hour: '19:00', orders: 124 },
    { hour: '20:00', orders: 112 },
    { hour: '21:00', orders: 78 },
    { hour: '22:00', orders: 45 },
    { hour: '23:00', orders: 23 },
]

// Average Prep Time Trend Data (Line Chart)
export interface PrepTimeData {
    week: string
    avgPrepTime: number
}

export const prepTimeData: PrepTimeData[] = [
    { week: 'Week 1', avgPrepTime: 18.5 },
    { week: 'Week 2', avgPrepTime: 17.2 },
    { week: 'Week 3', avgPrepTime: 16.8 },
    { week: 'Week 4', avgPrepTime: 15.9 },
    { week: 'Week 5', avgPrepTime: 15.3 },
    { week: 'Week 6', avgPrepTime: 14.7 },
    { week: 'Week 7', avgPrepTime: 14.2 },
    { week: 'Week 8', avgPrepTime: 13.9 },
    { week: 'Week 9', avgPrepTime: 13.5 },
    { week: 'Week 10', avgPrepTime: 13.1 },
    { week: 'Week 11', avgPrepTime: 12.8 },
    { week: 'Week 12', avgPrepTime: 12.5 },
]
