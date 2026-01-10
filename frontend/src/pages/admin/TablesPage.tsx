import { useState, useEffect } from 'react'
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Table as TableIcon,
    Users,
    CheckCircle2,
    Clock,
    XCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient, tablesApi } from '../../services/api'
import type { Table } from '@aerodine/shared-types'

// Table status types
type TableStatusType = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'UNAVAILABLE'

// API may return partial restaurant data, so we handle it flexibly
type TableWithRestaurant = Omit<Table, 'restaurant'> & {
    restaurant?: {
        id: number
        name: string
        address?: string | null
        isActive?: boolean
        createdAt?: Date | string
        updatedAt?: Date | string
    }
}

const statusConfig: Record<
    string,
    {
        label: string
        icon: typeof CheckCircle2
        bg: string
        text: string
        border: string
    }
> = {
    AVAILABLE: {
        label: 'Available',
        icon: CheckCircle2,
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-300',
    },
    OCCUPIED: {
        label: 'In Use',
        icon: Users,
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-300',
    },
    RESERVED: {
        label: 'Reserved',
        icon: Clock,
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
    },
    UNAVAILABLE: {
        label: 'Unavailable',
        icon: XCircle,
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
    },
}

function TableCard({
    table,
    onEdit,
    onDelete,
}: {
    table: TableWithRestaurant
    onEdit: (table: TableWithRestaurant) => void
    onDelete: (table: TableWithRestaurant) => void
}) {
    const statusKey = String(table.status)
    const config = statusConfig[statusKey] || statusConfig['AVAILABLE']
    const StatusIcon = config.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all border-2 border-gray-300"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${config.bg}`}>
                        <TableIcon size={24} className={config.text} />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                            {table.name}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                    <StatusIcon size={16} className={config.text} />
                    <span className={`text-sm font-medium ${config.text}`}>
                        {config.label}
                    </span>
                </div>

                {/* Capacity */}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users size={16} className="text-slate-400" />
                    <span>Capacity: {table.capacity} people</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                    onClick={() => onEdit(table)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors text-sm font-medium"
                >
                    <Edit size={16} />
                    Edit
                </button>
                <button
                    onClick={() => onDelete(table)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-lg transition-colors text-sm font-medium"
                >
                    <Trash2 size={16} />
                    Delete
                </button>
            </div>
        </motion.div>
    )
}

export default function TablesPage() {
    const [tables, setTables] = useState<TableWithRestaurant[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<TableStatusType | 'all'>(
        'all'
    )
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        fetchTables()
    }, [])

    const fetchTables = async () => {
        try {
            setLoading(true)
            setError(null)
            const tablesData = await apiClient.get('/tables')
            setTables(tablesData.data || [])
        } catch (err: any) {
            console.error('Error fetching tables:', err)
            setError('Unable to load table list. Please try again.')
            setTables([])
        } finally {
            setLoading(false)
        }
    }

    const filteredTables = tables.filter((table) => {
        const matchesSearch =
            table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            table.restaurant?.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        const matchesStatus =
            statusFilter === 'all' ||
            String(table.status) === String(statusFilter)
        return matchesSearch && matchesStatus
    })

    // Pagination calculations
    const totalPages = Math.ceil(filteredTables.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedTables = filteredTables.slice(startIndex, endIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter])

    const handleAddTable = () => {
        // TODO: Open add table modal/form
        alert('Add table feature will be implemented')
    }

    const handleEdit = (table: TableWithRestaurant) => {
        // TODO: Open edit table modal/form
        alert(`Edit table: ${table.name}`)
    }

    const handleDelete = async (table: TableWithRestaurant) => {
        if (
            !confirm(
                `Are you sure you want to delete ${table.name}? This action cannot be undone.`
            )
        ) {
            return
        }

        try {
            await apiClient.delete(`/tables/${table.id}`)
            setTables(tables.filter((t) => t.id !== table.id))
        } catch (err: any) {
            console.error('Error deleting table:', err)
            alert('Unable to delete table. Please try again.')
        }
    }

    const stats = {
        total: tables.length,
        available: tables.filter((t) => String(t.status) === 'AVAILABLE')
            .length,
        occupied: tables.filter((t) => String(t.status) === 'OCCUPIED').length,
        reserved: tables.filter((t) => String(t.status) === 'RESERVED').length,
        unavailable: tables.filter((t) => String(t.status) === 'UNAVAILABLE')
            .length,
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        Table Layout
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage and track table status
                    </p>
                </div>
                <button
                    onClick={handleAddTable}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
                >
                    <Plus size={20} />
                    Add Table
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Total Tables</p>
                    <p className="text-2xl font-semibold text-slate-900">
                        {stats.total}
                    </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Available</p>
                    <p className="text-2xl font-semibold text-slate-900">
                        {stats.available}
                    </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">In Use</p>
                    <p className="text-2xl font-semibold text-slate-900">
                        {stats.occupied}
                    </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Reserved</p>
                    <p className="text-2xl font-semibold text-slate-900">
                        {stats.reserved}
                    </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Unavailable</p>
                    <p className="text-2xl font-semibold text-slate-900">
                        {stats.unavailable}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search
                        size={20}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search tables..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(
                            e.target.value as TableStatusType | 'all'
                        )
                    }
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base text-slate-900 font-medium cursor-pointer"
                >
                    <option value="all">All Status</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">In Use</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                </select>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tables Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 animate-pulse"
                        >
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-slate-200"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                </div>
                            </div>
                            <div className="space-y-2 mb-4">
                                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <div className="flex-1 h-8 bg-slate-200 rounded"></div>
                                <div className="flex-1 h-8 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <TableIcon
                        size={48}
                        className="mx-auto text-slate-400 mb-4"
                    />
                    <p className="text-base text-slate-500">
                        {searchQuery || statusFilter !== 'all'
                            ? 'No tables found matching your criteria'
                            : 'No tables yet'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedTables.map((table) => (
                            <TableCard
                                key={table.id}
                                table={table}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                onClick={() =>
                                    setCurrentPage((prev) =>
                                        Math.max(1, prev - 1)
                                    )
                                }
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 &&
                                            page <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() =>
                                                    setCurrentPage(page)
                                                }
                                                className={`px-4 py-2 rounded-lg transition-colors ${
                                                    currentPage === page
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    } else if (
                                        page === currentPage - 2 ||
                                        page === currentPage + 2
                                    ) {
                                        return (
                                            <span
                                                key={page}
                                                className="px-2 text-slate-400"
                                            >
                                                ...
                                            </span>
                                        )
                                    }
                                    return null
                                })}
                            </div>
                            <button
                                onClick={() =>
                                    setCurrentPage((prev) =>
                                        Math.min(totalPages, prev + 1)
                                    )
                                }
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
