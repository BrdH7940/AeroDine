import { useState } from 'react'
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
    LineChart,
    Line,
} from 'recharts'
import { Calendar, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'
import {
    revenueGrowthData,
    paymentMethodsData,
    financialMetrics,
    menuPerformanceData,
    categorySalesData,
    voidedItemsData,
    peakHoursData,
    prepTimeData,
} from '../../data/mockReportsData'

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
function FinancialHealthTab() {
    // Calculate percentage change for revenue tooltip
    const enhancedRevenueData = revenueGrowthData.map((item, index) => {
        const prevPeriod =
            index > 0
                ? revenueGrowthData[index - 1].revenue
                : item.previousRevenue
        const change = ((item.revenue - prevPeriod) / prevPeriod) * 100
        return {
            ...item,
            change: change.toFixed(1),
        }
    })

    return (
        <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-500">
                            Gross Revenue
                        </p>
                        <DollarSign size={20} className="text-amber-500" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-900">
                        ${financialMetrics.grossRevenue.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-500">
                            Net Profit
                        </p>
                        <TrendingUp size={20} className="text-emerald-500" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-900">
                        ${financialMetrics.netProfit.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">30% margin</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-500">
                            Average Order Value
                        </p>
                        <ShoppingCart size={20} className="text-blue-500" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-900">
                        ${financialMetrics.averageOrderValue.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Revenue Growth Trend */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Revenue Growth Trend
                </h3>
                <p className="text-sm text-slate-500 mb-6">
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

            {/* Payment Methods Split */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Payment Methods Distribution
                </h3>
                <p className="text-sm text-slate-500 mb-6">
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
                                        percent ? (percent * 100).toFixed(0) : 0
                                    }%`
                                }
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {paymentMethodsData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                    />
                                ))}
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
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {paymentMethodsData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
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
            </div>
        </div>
    )
}

// Menu Insights Tab
function MenuInsightsTab() {
    // Calculate median values for reference lines
    const quantities = menuPerformanceData
        .map((d) => d.quantitySold)
        .sort((a, b) => a - b)
    const revenues = menuPerformanceData
        .map((d) => d.totalRevenue)
        .sort((a, b) => a - b)
    const medianQuantity = quantities[Math.floor(quantities.length / 2)]
    const medianRevenue = revenues[Math.floor(revenues.length / 2)]

    return (
        <div className="space-y-6">
            {/* Menu Performance Matrix */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Menu Performance Matrix
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                    BCG Matrix: Identify Stars, Plowhorses, Puzzles, and Dogs
                </p>
                <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                                                Quantity: {data.quantitySold}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                Revenue: $
                                                {data.totalRevenue.toFixed(2)}
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">
                            Stars
                        </p>
                        <p className="text-xs text-emerald-600">
                            High Revenue, High Sales
                        </p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-xs font-semibold text-amber-700 mb-1">
                            Plowhorses
                        </p>
                        <p className="text-xs text-amber-600">
                            High Sales, Low Revenue
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 mb-1">
                            Puzzles
                        </p>
                        <p className="text-xs text-blue-600">
                            Low Sales, High Revenue
                        </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-xs font-semibold text-red-700 mb-1">
                            Dogs
                        </p>
                        <p className="text-xs text-red-600">
                            Low Sales, Low Revenue
                        </p>
                    </div>
                </div>
            </div>

            {/* Sales by Category */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Sales by Category
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                    Compare performance across menu categories
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={categorySalesData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="category"
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
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                        />
                        <Bar
                            dataKey="sales"
                            fill="#f59e0b"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Top 5 Voided/Cancelled Items */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Top 5 Voided/Cancelled Items
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                    Items with highest cancellation rates and loss amounts
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                                    Item Name
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                                    Times Voided
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                                    Loss Amount
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                                    Reason
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {voidedItemsData.map((item, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                                        {item.itemName}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">
                                        {item.timesVoided}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-semibold text-red-600 text-right">
                                        ${item.lossAmount.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-500">
                                        {item.reason}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// Operational Efficiency Tab
function OperationalEfficiencyTab() {
    return (
        <div className="space-y-6">
            {/* Peak Hours Heatmap */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    Peak Hours Analysis
                </h3>
                <p className="text-sm text-slate-500 mb-6">
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
                            {peakHoursData.map((entry, index) => {
                                const hour = parseInt(entry.hour.split(':')[0])
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
                <p className="text-sm text-slate-500 mb-6">
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

    const tabs = ['Financial', 'Menu Insights', 'Operations']

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        Analytics & Reports
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Deep dive into your restaurant's performance
                    </p>
                </div>
                <DateRangeSelector value={dateRange} onChange={setDateRange} />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
                <div className="p-6">
                    {activeTab === 'Financial' && <FinancialHealthTab />}
                    {activeTab === 'Menu Insights' && <MenuInsightsTab />}
                    {activeTab === 'Operations' && <OperationalEfficiencyTab />}
                </div>
            </div>
        </div>
    )
}
