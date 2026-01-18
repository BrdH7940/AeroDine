/**
 * Reports & Analytics Page
 *
 * All charts now use real data from backend API:
 * - getDashboardStats (revenue, orders, tables)
 * - getRevenueChart (week/month)
 * - getTopSellingItems (top 5)
 * - getPaymentMethodsBreakdown (payment methods distribution)
 * - getCategorySales (sales by category)
 * - getVoidedItems (cancelled items)
 * - getPeakHours (order volume by hour)
 * - getDayOfWeekRevenue (revenue by day of week)
 * - getMenuPerformance (menu performance matrix)
 * - getTopModifiers (most used modifiers)
 * - getRatingVolume (rating vs volume)
 * - getPrepTimeTrends (prep time trends)
 */

import { useState, useEffect } from 'react'
import {
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea,
    LineChart,
    Line,
    ComposedChart,
} from 'recharts'
import { Calendar, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'
import { reportsApi } from '../../services/api'
import { authApi } from '../../services/auth'

// Date Range Selector Component
function DateRangeSelector({
    value,
    onChange,
}: {
    value: string
    onChange: (value: string) => void
}) {
    const options = [
        { label: 'Last 30 Days', value: '30' },
        { label: 'This Month', value: 'month' },
        { label: 'Last Month', value: 'lastMonth' },
        { label: 'Last 3 Months', value: '3months' },
    ]

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-100">
            <Calendar size={18} className="text-slate-500" />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-sm font-medium text-slate-900 border-none outline-none bg-transparent cursor-pointer"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

// Tabs Component
function Tabs({
    tabs,
    activeTab,
    onTabChange,
}: {
    tabs: string[]
    activeTab: string
    onTabChange: (tab: string) => void
}) {
    return (
        <div className="flex gap-2 border-b border-slate-200">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                        activeTab === tab
                            ? 'text-amber-500'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {tab}
                    {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                    )}
                </button>
            ))}
        </div>
    )
}

// Financial Health Tab
function FinancialHealthTab({
    stats,
    revenueChartData,
    paymentMethodsData,
    dayOfWeekRevenueData,
    loading,
}: {
    stats: any
    revenueChartData: any[]
    paymentMethodsData: any[]
    dayOfWeekRevenueData: any[]
    loading: boolean
}) {
    // Transform backend data for revenue growth chart
    const enhancedRevenueData = revenueChartData.map((item, index) => {
        const prevRevenue =
            index > 0 ? revenueChartData[index - 1].revenue : item.revenue
        const change =
            prevRevenue > 0
                ? ((item.revenue - prevRevenue) / prevRevenue) * 100
                : 0
        return {
            date: item.date || item.time,
            revenue: item.revenue,
            previousRevenue: prevRevenue,
            change: change.toFixed(1),
        }
    })

    // Calculate average order value
    const avgOrderValue =
        stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="mt-4 text-slate-500">
                        Loading financial data...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-500">
                            Total Revenue
                        </p>
                        <DollarSign size={20} className="text-amber-500" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-900">
                        ${stats.totalRevenue.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-500">
                            Total Orders
                        </p>
                        <ShoppingCart size={20} className="text-blue-500" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-900">
                        {stats.totalOrders.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-500">
                            Average Order Value
                        </p>
                        <TrendingUp size={20} className="text-emerald-500" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-900">
                        ${avgOrderValue.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Revenue Growth Trend */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Revenue Growth Trend
                </h3>
                <p className="text-base text-slate-500 mb-6">
                    Track your revenue trajectory over time
                </p>
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart
                        data={enhancedRevenueData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient
                                id="colorRevenue"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="#f59e0b"
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#f59e0b"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return `${
                                    date.getMonth() + 1
                                }/${date.getDate()}`
                            }}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const data = enhancedRevenueData.find(
                                        (d) => d.date === label
                                    )
                                    return (
                                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                                            <p className="text-sm font-semibold text-slate-900 mb-2">
                                                {label
                                                    ? new Date(
                                                          label as string
                                                      ).toLocaleDateString()
                                                    : ''}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                <span className="text-amber-500">
                                                    Revenue:
                                                </span>{' '}
                                                $
                                                {data?.revenue.toLocaleString()}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                <span className="text-slate-500">
                                                    vs Previous Period:
                                                </span>{' '}
                                                <span
                                                    className={
                                                        data &&
                                                        parseFloat(
                                                            data.change
                                                        ) >= 0
                                                            ? 'text-emerald-600'
                                                            : 'text-red-600'
                                                    }
                                                >
                                                    {data &&
                                                    parseFloat(data.change) >= 0
                                                        ? '+'
                                                        : ''}
                                                    {data?.change}%
                                                </span>
                                            </p>
                                        </div>
                                    )
                                }
                                return null
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Revenue by Day of Week and Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Day of Week */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900 mb-1">
                        Revenue by Day of Week
                    </h3>
                    <p className="text-base text-slate-500 mb-6">
                        Identify strong and weak business days
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={dayOfWeekRevenueData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                            />
                            <XAxis
                                dataKey="day"
                                stroke="#64748b"
                                fontSize={14}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={14}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip
                                formatter={(value: number | undefined) =>
                                    `$${(value ?? 0).toLocaleString()}`
                                }
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow:
                                        '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                }}
                            />
                            <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                                {dayOfWeekRevenueData.length > 0 &&
                                    dayOfWeekRevenueData.map((entry, index) => {
                                        const maxRevenue = Math.max(
                                            ...dayOfWeekRevenueData.map(
                                                (d) => d.revenue
                                            )
                                        )
                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    entry.revenue === maxRevenue
                                                        ? '#f59e0b' // amber-500
                                                        : '#64748b' // slate-200
                                                }
                                            />
                                        )
                                    })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Methods Split */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900 mb-1">
                        Payment Methods Distribution
                    </h3>
                    <p className="text-base text-slate-500 mb-6">
                        Cash vs. Digital Payments breakdown
                    </p>
                    <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentMethodsData as any[]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) =>
                                        `${name} ${
                                            percent
                                                ? (percent * 100).toFixed(0)
                                                : 0
                                        }%`
                                    }
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {paymentMethodsData.length > 0 &&
                                        paymentMethodsData.map(
                                            (entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                />
                                            )
                                        )}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number | undefined) =>
                                        `$${(value ?? 0).toLocaleString()}`
                                    }
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow:
                                            '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {paymentMethodsData.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {paymentMethodsData.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2"
                                >
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-sm text-slate-600">
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Menu Insights Tab
function MenuInsightsTab({
    topSellingItems,
    menuPerformanceData,
    categorySalesData,
    voidedItemsData,
    topModifiersData,
    ratingVolumeData,
    loading,
}: {
    topSellingItems: any[]
    menuPerformanceData: any[]
    categorySalesData: any[]
    voidedItemsData: any[]
    topModifiersData: any[]
    ratingVolumeData: any[]
    loading: boolean
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="mt-4 text-slate-500">
                        Loading menu insights...
                    </p>
                </div>
            </div>
        )
    }

    // Calculate median values for reference lines (using real data)
    const quantities =
        menuPerformanceData.length > 0
            ? menuPerformanceData
                  .map((d) => d.quantitySold)
                  .sort((a, b) => a - b)
            : []
    const revenues =
        menuPerformanceData.length > 0
            ? menuPerformanceData
                  .map((d) => d.totalRevenue)
                  .sort((a, b) => a - b)
            : []
    const medianQuantity =
        quantities.length > 0
            ? quantities[Math.floor(quantities.length / 2)]
            : 0
    const medianRevenue =
        revenues.length > 0 ? revenues[Math.floor(revenues.length / 2)] : 0

    // Calculate min and max for axes bounds
    const minQuantity =
        menuPerformanceData.length > 0
            ? Math.min(...menuPerformanceData.map((d) => d.quantitySold))
            : 0
    const maxQuantity =
        menuPerformanceData.length > 0
            ? Math.max(...menuPerformanceData.map((d) => d.quantitySold))
            : 100
    const minRevenue =
        menuPerformanceData.length > 0
            ? Math.min(...menuPerformanceData.map((d) => d.totalRevenue))
            : 0
    const maxRevenue =
        menuPerformanceData.length > 0
            ? Math.max(...menuPerformanceData.map((d) => d.totalRevenue))
            : 1000

    // Add padding for better visualization
    const quantityRange = maxQuantity - minQuantity
    const revenueRange = maxRevenue - minRevenue
    const paddedMinQuantity = Math.max(0, minQuantity - quantityRange * 0.1)
    const paddedMaxQuantity = maxQuantity + quantityRange * 0.1
    const paddedMinRevenue = Math.max(0, minRevenue - revenueRange * 0.1)
    const paddedMaxRevenue = maxRevenue + revenueRange * 0.1

    return (
        <div className="grid grid-cols-12 gap-6">
            {/* Row 1: Strategic Analysis */}
            {/* Menu Performance Matrix */}
            <div className="col-span-12 lg:col-span-8 bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Menu Matrix
                </h3>
                <p className="text-base text-slate-500 mb-6">
                    Popularity vs. Profitability
                </p>
                <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                            margin={{
                                top: 20,
                                right: 20,
                                bottom: 60,
                                left: 60,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                            />
                            <XAxis
                                type="number"
                                dataKey="quantitySold"
                                name="Quantity Sold"
                                label={{
                                    value: 'Quantity Sold (Popularity)',
                                    position: 'insideBottom',
                                    offset: -5,
                                }}
                                stroke="#64748b"
                                fontSize={12}
                                domain={[paddedMinQuantity, paddedMaxQuantity]}
                                tickFormatter={(value) =>
                                    Math.round(value).toString()
                                }
                            />
                            <YAxis
                                type="number"
                                dataKey="totalRevenue"
                                name="Total Revenue"
                                label={{
                                    value: 'Total Revenue (Profitability)',
                                    angle: -90,
                                    position: 'insideLeft',
                                }}
                                stroke="#64748b"
                                fontSize={12}
                                domain={[paddedMinRevenue, paddedMaxRevenue]}
                                tickFormatter={(value) =>
                                    Math.round(value).toString()
                                }
                            />
                            {/* Reference Areas for 4 quadrants */}
                            {/* Stars - Top Right (High Revenue, High Sales) */}
                            <ReferenceArea
                                x1={medianQuantity}
                                x2={paddedMaxQuantity}
                                y1={medianRevenue}
                                y2={paddedMaxRevenue}
                                fill="#d1fae5"
                                fillOpacity={0.3}
                                stroke="none"
                            />
                            {/* Plowhorses - Bottom Right (High Sales, Low Revenue) */}
                            <ReferenceArea
                                x1={medianQuantity}
                                x2={paddedMaxQuantity}
                                y1={paddedMinRevenue}
                                y2={medianRevenue}
                                fill="#fef3c7"
                                fillOpacity={0.3}
                                stroke="none"
                            />
                            {/* Puzzles - Top Left (Low Sales, High Revenue) */}
                            <ReferenceArea
                                x1={paddedMinQuantity}
                                x2={medianQuantity}
                                y1={medianRevenue}
                                y2={paddedMaxRevenue}
                                fill="#dbeafe"
                                fillOpacity={0.3}
                                stroke="none"
                            />
                            {/* Dogs - Bottom Left (Low Sales, Low Revenue) */}
                            <ReferenceArea
                                x1={paddedMinQuantity}
                                x2={medianQuantity}
                                y1={paddedMinRevenue}
                                y2={medianRevenue}
                                fill="#fee2e2"
                                fillOpacity={0.3}
                                stroke="none"
                            />
                            <ReferenceLine
                                x={medianQuantity}
                                stroke="#94a3b8"
                                strokeDasharray="3 3"
                                label={{ value: 'Median', position: 'top' }}
                            />
                            <ReferenceLine
                                y={medianRevenue}
                                stroke="#94a3b8"
                                strokeDasharray="3 3"
                                label={{ value: 'Median', position: 'right' }}
                            />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0]
                                            .payload as (typeof menuPerformanceData)[0]
                                        return (
                                            <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                                                <p className="text-sm font-semibold text-slate-900 mb-2">
                                                    {data.name}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    Quantity:{' '}
                                                    {data.quantitySold}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    Revenue: $
                                                    {data.totalRevenue.toFixed(
                                                        2
                                                    )}
                                                </p>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Scatter
                                name="Menu Items"
                                data={menuPerformanceData}
                                fill="#f59e0b"
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="text-sm font-semibold text-emerald-700 mb-1">
                            Stars
                        </p>
                        <p className="text-sm text-emerald-600">
                            High Revenue, High Sales
                        </p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-sm font-semibold text-amber-700 mb-1">
                            Plowhorses
                        </p>
                        <p className="text-sm text-amber-600">
                            High Sales, Low Revenue
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm font-semibold text-blue-700 mb-1">
                            Puzzles
                        </p>
                        <p className="text-sm text-blue-600">
                            Low Sales, High Revenue
                        </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm font-semibold text-red-700 mb-1">
                            Dogs
                        </p>
                        <p className="text-sm text-red-600">
                            Low Sales, Low Revenue
                        </p>
                    </div>
                </div>
            </div>

            {/* Top Modifiers */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-6 border border-slate-100 shadow-sm h-[500px] flex flex-col">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Top Modifiers
                </h3>
                <p className="text-base text-slate-500 mb-4">
                    Most requested customizations
                </p>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={topModifiersData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                                horizontal={true}
                                vertical={false}
                            />
                            <XAxis
                                type="number"
                                stroke="#64748b"
                                fontSize={14}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#64748b"
                                fontSize={14}
                                tickLine={false}
                                axisLine={false}
                                width={100}
                            />
                            <Tooltip
                                formatter={(value: number | undefined) =>
                                    `${value ?? 0} times`
                                }
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow:
                                        '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    fontSize: '12px',
                                }}
                            />
                            <Bar
                                dataKey="usage"
                                fill="#f59e0b"
                                radius={[0, 4, 4, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 2: Sales Charts */}
            {/* Sales by Category */}
            <div className="col-span-12 lg:col-span-6 bg-white rounded-xl p-6 border border-slate-100 shadow-sm h-[300px] flex flex-col">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Sales by Category
                </h3>
                <p className="text-base text-slate-500 mb-4">
                    Category performance
                </p>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={categorySalesData}
                            margin={{
                                top: 5,
                                right: 10,
                                left: 0,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                            />
                            <XAxis
                                dataKey="category"
                                stroke="#64748b"
                                fontSize={14}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={14}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip
                                formatter={(value: number | undefined) =>
                                    `$${(value ?? 0).toLocaleString()}`
                                }
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow:
                                        '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    fontSize: '12px',
                                }}
                            />
                            <Bar
                                dataKey="sales"
                                fill="#f59e0b"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Rating vs Volume */}
            <div className="col-span-12 lg:col-span-6 bg-white rounded-xl p-6 border border-slate-100 shadow-sm h-[300px] flex flex-col">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Rating vs Volume
                </h3>
                <p className="text-base text-slate-500 mb-4">
                    Customer satisfaction vs sales volume
                </p>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={ratingVolumeData}
                            margin={{
                                top: 5,
                                right: 10,
                                left: 0,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                            />
                            <XAxis
                                dataKey="item"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                            />
                            <YAxis
                                yAxisId="volume"
                                stroke="#64748b"
                                fontSize={14}
                                tickLine={false}
                                axisLine={false}
                                orientation="left"
                            />
                            <YAxis
                                yAxisId="rating"
                                stroke="#f59e0b"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                orientation="right"
                                domain={[0, 5]}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = ratingVolumeData.find(
                                            (d) =>
                                                d.item ===
                                                payload[0]?.payload?.item
                                        )
                                        return (
                                            <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                                                <p className="text-sm font-semibold text-slate-900 mb-2">
                                                    {data?.item}
                                                </p>
                                                {payload.map((entry, idx) => (
                                                    <p
                                                        key={idx}
                                                        className="text-sm text-slate-600"
                                                    >
                                                        <span
                                                            style={{
                                                                color: entry.color,
                                                            }}
                                                        >
                                                            {entry.name ===
                                                            'volume'
                                                                ? 'Volume'
                                                                : 'Rating'}
                                                            :
                                                        </span>{' '}
                                                        {entry.name === 'volume'
                                                            ? entry.value
                                                            : entry.value?.toFixed(
                                                                  1
                                                              )}
                                                    </p>
                                                ))}
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Bar
                                yAxisId="volume"
                                dataKey="volume"
                                fill="#64748b"
                                radius={[4, 4, 0, 0]}
                            />
                            <Line
                                yAxisId="rating"
                                type="monotone"
                                dataKey="rating"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ fill: '#f59e0b', r: 3 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 3: Detailed Metrics */}
            {/* Top 5 Best Selling Items */}
            <div className="col-span-12 lg:col-span-6 bg-white rounded-xl p-6 border border-slate-100 shadow-sm h-[400px] flex flex-col">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Top 5 Best Selling Items
                </h3>
                <p className="text-base text-slate-500 mb-4">
                    Highest performing menu items
                </p>
                <div className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white">
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-base font-semibold text-slate-700">
                                    Item Name
                                </th>
                                <th className="text-left py-3 px-4 text-base font-semibold text-slate-700">
                                    Quantity
                                </th>
                                <th className="text-right py-3 px-4 text-base font-semibold text-slate-700">
                                    Revenue
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {topSellingItems.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="py-8 text-center text-slate-500"
                                    >
                                        No data available
                                    </td>
                                </tr>
                            ) : (
                                topSellingItems.map((item, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-base font-medium text-slate-900">
                                            {item.menuItemName}
                                        </td>
                                        <td className="py-3 px-4 text-base text-slate-600">
                                            {item.totalQuantity}
                                        </td>
                                        <td className="py-3 px-4 text-base font-semibold text-emerald-600 text-right">
                                            $
                                            {(
                                                Number(item.basePrice) *
                                                item.totalQuantity
                                            ).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Voided Items Analysis */}
            <div className="col-span-12 lg:col-span-6 bg-white rounded-xl p-6 border border-slate-100 shadow-sm h-[400px] flex flex-col">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Top 5 Voided Items
                </h3>
                <p className="text-base text-slate-500 mb-4">
                    Items with highest cancellation rates and loss amounts
                </p>
                <div className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white">
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-base font-semibold text-slate-700">
                                    Item Name
                                </th>
                                <th className="text-left py-3 px-4 text-base font-semibold text-slate-700">
                                    Times Voided
                                </th>
                                <th className="text-right py-3 px-4 text-base font-semibold text-slate-700">
                                    Loss Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {voidedItemsData.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="py-8 text-center text-slate-500"
                                    >
                                        No voided items
                                    </td>
                                </tr>
                            ) : (
                                voidedItemsData.map((item, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-base font-medium text-slate-900">
                                            {item.itemName}
                                        </td>
                                        <td className="py-3 px-4 text-base text-slate-600">
                                            {item.timesVoided}
                                        </td>
                                        <td className="py-3 px-4 text-base font-semibold text-red-600 text-right">
                                            ${item.lossAmount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// Operational Efficiency Tab
function OperationalEfficiencyTab({
    peakHoursData,
    prepTimeData,
    loading,
}: {
    peakHoursData: any[]
    prepTimeData: any[]
    loading: boolean
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="mt-4 text-slate-500">
                        Loading operational data...
                    </p>
                </div>
            </div>
        )
    }
    return (
        <div className="space-y-6">
            {/* Peak Hours Heatmap */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Peak Hours Analysis
                </h3>
                <p className="text-base text-slate-500 mb-6">
                    Identify optimal staffing schedules based on order volume
                </p>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                        data={peakHoursData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="hour"
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                        />
                        <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                            {peakHoursData.length > 0 &&
                                peakHoursData.map((entry, index) => {
                                    const hour = parseInt(
                                        entry.hour.split(':')[0]
                                    )
                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                hour >= 18 && hour <= 20
                                                    ? '#0f172a'
                                                    : '#64748b'
                                            }
                                        />
                                    )
                                })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-900 rounded" />
                        <span>Peak Hours (18:00-20:00)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-500 rounded" />
                        <span>Regular Hours</span>
                    </div>
                </div>
            </div>

            {/* Average Prep Time Trend */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Average Prep Time Trend
                </h3>
                <p className="text-base text-slate-500 mb-6">
                    Monitor kitchen consistency and efficiency
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                        data={prepTimeData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="week"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            label={{
                                value: 'Minutes',
                                angle: -90,
                                position: 'insideLeft',
                            }}
                        />
                        <ReferenceLine
                            y={15}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                                value: 'Target: 15 mins',
                                position: 'right',
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                            formatter={(value: number | undefined) =>
                                `${(value ?? 0).toFixed(1)} mins`
                            }
                        />
                        <Line
                            type="monotone"
                            dataKey="avgPrepTime"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={{ fill: '#f59e0b', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('Financial')
    const [dateRange, setDateRange] = useState('30')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // State for real API data
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        activeTables: 0,
    })
    const [revenueChartData, setRevenueChartData] = useState<any[]>([])
    const [topSellingItems, setTopSellingItems] = useState<any[]>([])
    const [paymentMethodsData, setPaymentMethodsData] = useState<any[]>([])
    const [categorySalesData, setCategorySalesData] = useState<any[]>([])
    const [voidedItemsData, setVoidedItemsData] = useState<any[]>([])
    const [peakHoursData, setPeakHoursData] = useState<any[]>([])
    const [dayOfWeekRevenueData, setDayOfWeekRevenueData] = useState<any[]>([])
    const [menuPerformanceData, setMenuPerformanceData] = useState<any[]>([])
    const [topModifiersData, setTopModifiersData] = useState<any[]>([])
    const [ratingVolumeData, setRatingVolumeData] = useState<any[]>([])
    const [prepTimeData, setPrepTimeData] = useState<any[]>([])

    const tabs = ['Financial', 'Menu Insights', 'Operations']

    useEffect(() => {
        initializeAndFetchReportsData()
    }, [dateRange])

    const initializeAndFetchReportsData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Check authentication and ensure token is available
            if (!authApi.isAuthenticated()) {
                // Auto-login in development mode if not authenticated
                if (import.meta.env.DEV) {
                    try {
                        const success = await authApi.autoLoginDev()
                        if (!success) {
                            setError('Please login to view reports.')
                            setLoading(false)
                            return
                        }
                    } catch {
                        setError('Please login to view reports.')
                        setLoading(false)
                        return
                    }
                } else {
                    setError('Please login to view reports.')
                    setLoading(false)
                    return
                }
            }

            // Verify token exists before making API calls
            const token = authApi.getToken()
            if (!token) {
                setError('Authentication token not found. Please login again.')
                setLoading(false)
                return
            }

            await fetchReportsData()
        } catch (err: any) {
            // Handle specific error cases
            if (err.response?.status === 401) {
                setError('Session expired. Please login again.')
            } else {
                setError(
                    'Unable to load reports data. Please check if backend is running.'
                )
            }
        } finally {
            setLoading(false)
        }
    }

    const fetchReportsData = async () => {
        try {
            const [
                statsData,
                revenueData,
                topItemsData,
                paymentMethods,
                categorySales,
                voidedItems,
                peakHours,
                dayOfWeekRevenue,
                menuPerformance,
                topModifiers,
                ratingVolume,
                prepTimeTrends,
            ] = await Promise.all([
                reportsApi.getDashboardStats(),
                reportsApi.getRevenueChart(dateRange),
                reportsApi.getTopSellingItems(),
                reportsApi.getPaymentMethodsBreakdown(),
                reportsApi.getCategorySales(),
                reportsApi.getVoidedItems(),
                reportsApi.getPeakHours(),
                reportsApi.getDayOfWeekRevenue(),
                reportsApi.getMenuPerformance(),
                reportsApi.getTopModifiers(),
                reportsApi.getRatingVolume(),
                reportsApi.getPrepTimeTrends(),
            ])

            setStats(statsData)

            // Transform revenue data for charts
            const transformedData = revenueData.labels.map(
                (label: string, index: number) => ({
                    date: label,
                    time: label,
                    revenue: revenueData.data[index],
                })
            )
            setRevenueChartData(transformedData)

            setTopSellingItems(topItemsData || [])

            // Transform payment methods data (add colors)
            const paymentMethodColors: Record<string, string> = {
                CARD: '#0f172a', // slate-900
                CASH: '#f59e0b', // amber-500
                QR_CODE: '#9ca3af', // gray-400
                E_WALLET: '#64748b', // slate-500
            }
            const transformedPaymentMethods = (paymentMethods || []).map(
                (item: any) => ({
                    name: item.name.replace('_', ' '),
                    value: item.value,
                    color: paymentMethodColors[item.name] || '#64748b',
                })
            )
            setPaymentMethodsData(transformedPaymentMethods)

            setCategorySalesData(categorySales || [])
            setVoidedItemsData(voidedItems || [])
            setPeakHoursData(peakHours || [])
            setDayOfWeekRevenueData(dayOfWeekRevenue || [])
            setMenuPerformanceData(menuPerformance || [])
            setTopModifiersData(topModifiers || [])
            setRatingVolumeData(ratingVolume || [])
            setPrepTimeData(prepTimeTrends || [])
        } catch (err: any) {
            // Don't set error here if it's a 401 - let the interceptor handle it
            // The interceptor will try to refresh the token or redirect to login
            if (err.response?.status === 401) {
                // Token might be expired - interceptor should handle refresh
                // If we get here, refresh likely failed
                setError('Session expired. Please refresh the page or login again.')
            } else if (err.response?.status === 403) {
                setError('You do not have permission to view reports. Admin access required.')
            } else if (err.response?.status === 404) {
                setError(
                    'Backend endpoint not found. Please check if backend is running.'
                )
            } else {
                setError(
                    `Unable to load reports data: ${
                        err.response?.data?.message ||
                        err.message ||
                        'Unknown error'
                    }`
                )
            }
            throw err
        }
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        Analytics & Reports
                    </h1>
                    <p className="text-base text-slate-500 mt-1">
                        Deep dive into your restaurant's performance
                    </p>
                </div>
                <DateRangeSelector value={dateRange} onChange={setDateRange} />
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
                <div className="p-6">
                    {activeTab === 'Financial' && (
                        <FinancialHealthTab
                            stats={stats}
                            revenueChartData={revenueChartData}
                            paymentMethodsData={paymentMethodsData}
                            dayOfWeekRevenueData={dayOfWeekRevenueData}
                            loading={loading}
                        />
                    )}
                    {activeTab === 'Menu Insights' && (
                        <MenuInsightsTab
                            topSellingItems={topSellingItems}
                            menuPerformanceData={menuPerformanceData}
                            categorySalesData={categorySalesData}
                            voidedItemsData={voidedItemsData}
                            topModifiersData={topModifiersData}
                            ratingVolumeData={ratingVolumeData}
                            loading={loading}
                        />
                    )}
                    {activeTab === 'Operations' && (
                        <OperationalEfficiencyTab
                            peakHoursData={peakHoursData}
                            prepTimeData={prepTimeData}
                            loading={loading}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
