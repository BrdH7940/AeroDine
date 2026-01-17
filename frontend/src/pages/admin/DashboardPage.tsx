import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { reportsApi, ordersApi } from '../../services/api'
import { authApi } from '../../services/auth'
import type { OrderStatus } from '@aerodine/shared-types'

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

interface DashboardStats {
    totalRevenue: number
    totalOrders: number
    activeTables: number
}

interface RevenueChartData {
    labels: string[]
    data: number[]
}

interface RecentOrder {
    id: number
    tableNumber?: number
    createdAt: string
    totalAmount: number
    status: OrderStatus
    table?: {
        name: string
    }
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split('T')[0]
    )
    const [stats, setStats] = useState<DashboardStats>({
        totalRevenue: 0,
        totalOrders: 0,
        activeTables: 0,
    })
    const [chartData, setChartData] = useState<
        { time: string; revenue: number }[]
    >([])
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        initializeAndFetchData()
    }, [])

    const initializeAndFetchData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Auto-login in development mode if not authenticated
            if (import.meta.env.DEV && !authApi.isAuthenticated()) {
                try {
                    await authApi.autoLoginDev()
                } catch {
                    // Auto-login failed, continuing without auth
                }
            }

            await fetchDashboardData()
        } catch {
            setError('Unable to load dashboard data. Please check if backend is running.')
        } finally {
            setLoading(false)
        }
    }

    const fetchDashboardData = async () => {
        try {
            // Fetch stats, revenue chart, and recent orders in parallel
            const [statsData, revenueData, ordersData] = await Promise.all([
                reportsApi.getDashboardStats(),
                reportsApi.getRevenueChart('week'),
                ordersApi.getOrders({ restaurantId: 2 }), // TODO: Get restaurantId from context/auth - TEMP: using 2 to match database
            ])

            setStats(statsData)

            // Transform revenue data for chart
            const transformedChartData = revenueData.labels.map(
                (label: string, index: number) => ({
                    time: label,
                    revenue: revenueData.data[index],
                })
            )
            setChartData(transformedChartData)

            // Get recent 5 orders sorted by date
            const sortedOrders = (ordersData?.orders || [])
                .sort(
                    (a: RecentOrder, b: RecentOrder) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                )
                .slice(0, 5)
            setRecentOrders(sortedOrders)
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Authentication required. Please login.')
            } else if (err.response?.status === 404) {
                setError('Backend endpoint not found. Please check if backend is running.')
            } else {
                setError(`Unable to load dashboard data: ${err.response?.data?.message || err.message || 'Unknown error'}`)
            }
            throw err // Re-throw to be caught by initializeAndFetchData
        }
    }

    const formatCurrency = (value: number) => `$${value.toFixed(2)}`

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInMinutes = Math.floor(
            (now.getTime() - date.getTime()) / 60000
        )

        if (diffInMinutes < 1) return 'just now'
        if (diffInMinutes < 60) return `${diffInMinutes} min ago`
        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24)
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        const diffInDays = Math.floor(diffInHours / 24)
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    }

    if (loading) {
        return (
            <div className="p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                        <p className="mt-4 text-slate-500">
                            Loading dashboard...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

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

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        {error.includes('Authentication required') && (
                            <button
                                onClick={() => navigate('/auth/login?returnUrl=/admin')}
                                className="ml-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    icon={DollarSign}
                    value={stats.totalRevenue}
                    label="Revenue"
                    trend={12.5}
                    iconColor="bg-amber-100"
                />
                <KPICard
                    icon={ShoppingCart}
                    value={stats.totalOrders}
                    label="Total orders"
                    trend={-3.2}
                    iconColor="bg-blue-100"
                />
                <KPICard
                    icon={TableIcon}
                    value={`${stats.activeTables}`}
                    label="Active tables"
                    trend={5.1}
                    iconColor="bg-purple-100"
                />
                <KPICard
                    icon={Star}
                    value={4.8}
                    label="Customer rating"
                    trend={0.3}
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
                                {recentOrders.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-8 text-center text-slate-500"
                                        >
                                            No recent orders
                                        </td>
                                    </tr>
                                ) : (
                                    recentOrders.map((order) => (
                                        <motion.tr
                                            key={order.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="py-3 px-4 text-base font-semibold text-slate-900">
                                                {order.table?.name ||
                                                    `Table ${
                                                        order.tableNumber ||
                                                        'N/A'
                                                    }`}
                                            </td>
                                            <td className="py-3 px-4">
                                                <StatusBadge
                                                    status={order.status.toLowerCase()}
                                                />
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-500">
                                                {getTimeAgo(order.createdAt)}
                                            </td>
                                            <td className="py-3 px-4 text-base font-medium text-slate-900 text-right">
                                                {formatCurrency(
                                                    Number(order.totalAmount)
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
