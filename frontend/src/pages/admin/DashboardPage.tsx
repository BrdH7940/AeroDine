import { useState } from 'react'
import {
    DollarSign,
    ShoppingCart,
    Table as TableIcon,
    Star,
    TrendingUp,
    TrendingDown,
    Calendar,
} from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import { kpiData, chartData, recentOrders } from '../../data/mockData'

interface KPICardProps {
    icon: React.ElementType
    value: string | number
    label: string
    trend: number
    iconColor: string
}

function KPICard({ icon: Icon, value, label, trend, iconColor }: KPICardProps) {
    const isPositive = trend >= 0
    const TrendIcon = isPositive ? TrendingUp : TrendingDown

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-base font-medium text-slate-500 mb-1">
                        {label}
                    </p>
                    <p className="text-2xl font-semibold text-slate-900 mb-2">
                        {typeof value === 'number' && value < 1000
                            ? value
                            : typeof value === 'number'
                            ? `$${value.toLocaleString()}`
                            : value}
                    </p>
                    <div className="flex items-center gap-1">
                        <TrendIcon
                            size={14}
                            className={
                                isPositive ? 'text-emerald-500' : 'text-red-500'
                            }
                        />
                        <span
                            className={`text-base font-medium ${
                                isPositive ? 'text-emerald-600' : 'text-red-600'
                            }`}
                        >
                            {Math.abs(trend)}%
                        </span>
                        <span className="text-base text-slate-500">
                            vs last period
                        </span>
                    </div>
                </div>
                <div className={`p-3 rounded-lg ${iconColor}`}>
                    <Icon size={24} className="text-slate-700" />
                </div>
            </div>
        </motion.div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const statusConfig = {
        pending: {
            bg: 'bg-amber-100',
            text: 'text-amber-700',
            label: 'Pending',
        },
        preparing: {
            bg: 'bg-blue-100',
            text: 'text-blue-700',
            label: 'Preparing',
        },
        ready: {
            bg: 'bg-emerald-100',
            text: 'text-emerald-700',
            label: 'Ready',
        },
        completed: {
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            label: 'Completed',
        },
    }

    const config =
        statusConfig[status as keyof typeof statusConfig] ||
        statusConfig.pending

    return (
        <span
            className={`px-2 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}
        >
            {config.label}
        </span>
    )
}

export default function DashboardPage() {
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split('T')[0]
    )

    const formatCurrency = (value: number) => `$${value.toFixed(2)}`

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-semibold text-slate-900">
                    Dashboard
                </h1>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
                    <Calendar size={18} className="text-slate-500" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-sm font-medium text-slate-900 border-none outline-none bg-transparent"
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    icon={DollarSign}
                    value={kpiData.revenue.value}
                    label={kpiData.revenue.label}
                    trend={kpiData.revenue.trend}
                    iconColor="bg-amber-100"
                />
                <KPICard
                    icon={ShoppingCart}
                    value={kpiData.activeOrders.value}
                    label={kpiData.activeOrders.label}
                    trend={kpiData.activeOrders.trend}
                    iconColor="bg-blue-100"
                />
                <KPICard
                    icon={TableIcon}
                    value={`${kpiData.tableOccupancy.value}%`}
                    label={kpiData.tableOccupancy.label}
                    trend={kpiData.tableOccupancy.trend}
                    iconColor="bg-purple-100"
                />
                <KPICard
                    icon={Star}
                    value={kpiData.customerRating.value}
                    label={kpiData.customerRating.label}
                    trend={kpiData.customerRating.trend}
                    iconColor="bg-emerald-100"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-1">
                            Revenue overview
                        </h2>
                        <p className="text-base text-slate-500">
                            Today's hourly revenue breakdown
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ left: -20 }}>
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
                                        stopColor="#F7720C"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                            />
                            <XAxis
                                dataKey="time"
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
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow:
                                        '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    fontSize: '14px',
                                }}
                                formatter={(value: number | undefined) =>
                                    formatCurrency(value ?? 0)
                                }
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#F7720C"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-1">
                            Recent activity
                        </h2>
                        <p className="text-base text-slate-500">
                            Latest orders
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-lg font-semibold text-slate-700">
                                        Table
                                    </th>
                                    <th className="text-left py-3 px-4 text-lg font-semibold text-slate-700">
                                        Status
                                    </th>
                                    <th className="text-left py-3 px-4 text-lg font-semibold text-slate-700">
                                        Time
                                    </th>
                                    <th className="text-right py-3 px-4 text-lg font-semibold text-slate-700">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <motion.tr
                                        key={order.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-base font-semibold text-slate-900">
                                            Table {order.tableNumber}
                                        </td>
                                        <td className="py-3 px-4">
                                            <StatusBadge
                                                status={order.status}
                                            />
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-500">
                                            {order.time}
                                        </td>
                                        <td className="py-3 px-4 text-base font-medium text-slate-900 text-right">
                                            {formatCurrency(order.amount)}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
