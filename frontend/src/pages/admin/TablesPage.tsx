import { useState, useEffect, useMemo, useCallback } from 'react'
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
    X,
    Download,
    RefreshCw,
    Printer,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Fuse from 'fuse.js'
import { tablesApi } from '../../services/api'
import { authService } from '../../services/auth.service'
import { TableStatus } from '@aerodine/shared-types'
import type { Table, TableStatusEvent } from '@aerodine/shared-types'
import { useModal } from '../../contexts/ModalContext'
import { useRestaurantRoom, useTableStatusChanged } from '../../hooks/useSocket'
import { useUserStore } from '../../store/userStore'

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
    onDownloadQR,
    onPrintQR,
    onRegenerateQR,
}: {
    table: TableWithRestaurant
    onEdit: (table: TableWithRestaurant) => void
    onDelete: (table: TableWithRestaurant) => void
    onDownloadQR: (table: TableWithRestaurant) => void
    onPrintQR: (table: TableWithRestaurant) => void
    onRegenerateQR: (table: TableWithRestaurant) => void
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
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                <div className="flex gap-2">
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
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDownloadQR(table)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors text-sm font-medium"
                        title="Download QR Code"
                    >
                        <Download size={16} />
                        Download
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onPrintQR(table)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-600 rounded-lg transition-colors text-sm font-medium"
                        title="Print QR Code"
                    >
                        <Printer size={16} />
                        Print
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onRegenerateQR(table)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-600 rounded-lg transition-colors text-sm font-medium"
                        title="Regenerate QR Code"
                    >
                        <RefreshCw size={16} />
                        Regenerate
                    </button>
                </div>
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
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedTable, setSelectedTable] = useState<TableWithRestaurant | null>(null)
    const [restaurantId, setRestaurantId] = useState<number | null>(null)
    const { confirm, alert } = useModal()
    const { user } = useUserStore()

    // Join restaurant room for real-time updates
    useRestaurantRoom(restaurantId || 0, user?.id)

    // Handle table status changes via WebSocket
    const handleTableStatusChanged = useCallback(
        (event: TableStatusEvent) => {
            console.log('🔔 Table status changed via Socket:', event)
            setTables((prev) =>
                prev.map((table) => {
                    if (table.id === event.tableId) {
                        return {
                            ...table,
                            status: event.newStatus as TableStatus,
                        }
                    }
                    return table
                })
            )
        },
        []
    )

    useTableStatusChanged(handleTableStatusChanged)

    useEffect(() => {
        initializeAndFetchTables()
    }, [])

    const initializeAndFetchTables = async () => {
        try {
            setLoading(true)
            setError(null)

            // Auto-login in development mode if not authenticated
            if (import.meta.env.DEV && !authService.isAuthenticated()) {
                try {
                    await authService.autoLoginDev()
                } catch {
                    // Auto-login failed, continuing without auth
                }
            }

            await fetchTables()
        } catch {
            setError('Unable to load table list. Please check if backend is running.')
        } finally {
            setLoading(false)
        }
    }

    const fetchTables = async () => {
        try {
            const tablesData = await tablesApi.getTables()
            setTables(Array.isArray(tablesData) ? tablesData : [])
            // Get restaurantId from first table if available
            if (tablesData && Array.isArray(tablesData) && tablesData.length > 0 && tablesData[0].restaurantId) {
                setRestaurantId(tablesData[0].restaurantId)
            } else {
                // Fallback: use restaurantId = 2 (matches current database)
                setRestaurantId(2)
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Authentication required. Please login.')
            } else if (err.response?.status === 404) {
                setError('Backend endpoint not found. Please check if backend is running.')
            } else {
                setError(`Unable to load table list: ${err.response?.data?.message || err.message || 'Unknown error'}`)
            }
            setTables([])
            throw err
        }
    }

    const filteredTables = useMemo(() => {
        // First filter by status
        let result = tables.filter((table) => {
            const matchesStatus =
                statusFilter === 'all' ||
                String(table.status) === String(statusFilter)
            return matchesStatus
        })

        // Apply fuzzy search if there's a search query
        if (searchQuery.trim() !== '') {
            const fuse = new Fuse(result, {
                keys: [
                    { name: 'name', weight: 0.7 },
                    { name: 'restaurant.name', weight: 0.3 },
                ],
                threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
                ignoreLocation: true,
                includeScore: true,
                minMatchCharLength: 1,
            })

            const searchResults = fuse.search(searchQuery)
            result = searchResults.map((result) => result.item)
        }

        return result
    }, [tables, searchQuery, statusFilter])

    // Pagination calculations
    const totalPages = Math.ceil(filteredTables.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedTables = filteredTables.slice(startIndex, endIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter])

    const handleAddTable = async () => {
        if (!restaurantId) {
            await alert({
                title: 'Error',
                message: 'Restaurant ID not found. Please check database configuration.',
                type: 'error',
            })
            return
        }
        setSelectedTable(null)
        setIsAddModalOpen(true)
    }

    const handleEdit = (table: TableWithRestaurant) => {
        setSelectedTable(table)
        setIsEditModalOpen(true)
    }

    const handleDelete = async (table: TableWithRestaurant) => {
        const confirmed = await confirm({
            title: 'Delete Table',
            message: `Are you sure you want to delete ${table.name}? This action cannot be undone.`,
            type: 'warning',
            confirmText: 'Delete',
            cancelText: 'Cancel',
        })
        if (!confirmed) {
            return
        }

        try {
            await tablesApi.deleteTable(table.id)
            setTables(tables.filter((t) => t.id !== table.id))
            await alert({
                title: 'Success',
                message: `Table ${table.name} has been deleted successfully.`,
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to delete table: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        }
    }

    const getQRCodeImageUrl = (qrUrl: string, size: number = 300) => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrUrl)}`
    }

    const handleDownloadQR = async (table: TableWithRestaurant) => {
        try {
            // Get QR URL from backend
            const qrData = await tablesApi.getTableQrUrl(table.id)
            const qrUrl = qrData.qrUrl

            // Create QR code image using a simple approach
            const qrCodeImageUrl = getQRCodeImageUrl(qrUrl, 300)

            // Create a temporary anchor element to download
            const link = document.createElement('a')
            link.href = qrCodeImageUrl
            link.download = `QR-Table-${table.name}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to download QR code: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        }
    }

    const handlePrintQR = async (table: TableWithRestaurant) => {
        try {
            // Get QR URL from backend
            const qrData = await tablesApi.getTableQrUrl(table.id)
            const qrUrl = qrData.qrUrl

            // Create QR code image with larger size for printing
            const qrCodeImageUrl = getQRCodeImageUrl(qrUrl, 500)

            // Create a new window for printing
            const printWindow = window.open('', '_blank')
            if (!printWindow) {
                await alert({
                    title: 'Popup Blocked',
                    message: 'Please allow popups to print QR code',
                    type: 'warning',
                })
                return
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>QR Code - ${table.name}</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            margin: 0;
                            font-family: Arial, sans-serif;
                        }
                        h2 {
                            margin-bottom: 20px;
                            color: #333;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                        @media print {
                            body {
                                margin: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h2>Table: ${table.name}</h2>
                    <img src="${qrCodeImageUrl}" alt="QR Code for ${table.name}" />
                    <p style="margin-top: 20px; color: #666;">Scan this QR code to access the menu</p>
                </body>
                </html>
            `)
            printWindow.document.close()

            // Wait for image to load, then print
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print()
                }, 250)
            }
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to print QR code: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        }
    }

    const handleRegenerateQR = async (table: TableWithRestaurant) => {
        const confirmed = await confirm({
            title: 'Regenerate QR Code',
            message: `Are you sure you want to regenerate the QR code for ${table.name}? The old QR code will no longer work.`,
            type: 'warning',
            confirmText: 'Regenerate',
            cancelText: 'Cancel',
        })
        if (!confirmed) {
            return
        }

        try {
            await tablesApi.refreshTableToken(table.id)
            await alert({
                title: 'Success',
                message: `QR code for ${table.name} has been regenerated successfully.`,
                type: 'success',
            })
            // Refresh tables to get updated data
            await fetchTables()
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to regenerate QR code: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        }
    }

    const handleRegenerateAllQR = async () => {
        const confirmed = await confirm({
            title: 'Regenerate All QR Codes',
            message: `Are you sure you want to regenerate QR codes for ALL tables? All old QR codes will no longer work. This action cannot be undone.`,
            type: 'warning',
            confirmText: 'Regenerate All',
            cancelText: 'Cancel',
        })
        if (!confirmed) {
            return
        }

        try {
            await tablesApi.refreshAllTableTokens(restaurantId || undefined)
            await alert({
                title: 'Success',
                message: `All QR codes have been regenerated successfully.`,
                type: 'success',
            })
            // Refresh tables to get updated data
            await fetchTables()
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to regenerate QR codes: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        }
    }

    const handleCloseModals = () => {
        setIsAddModalOpen(false)
        setIsEditModalOpen(false)
        setSelectedTable(null)
    }

    const handleSaveTable = async (formData: {
        name: string
        capacity: number
        status: TableStatus
        isActive?: boolean
    }) => {
        try {
            if (!restaurantId) {
                await alert({
                    title: 'Error',
                    message: 'Restaurant ID not found',
                    type: 'error',
                })
                return
            }

            if (selectedTable) {
                // Update existing table
                await tablesApi.updateTable(selectedTable.id, {
                    name: formData.name,
                    capacity: formData.capacity,
                    status: formData.status,
                    isActive: formData.isActive,
                })
            } else {
                // Create new table
                await tablesApi.createTable({
                    restaurantId,
                    name: formData.name,
                    capacity: formData.capacity,
                    status: formData.status,
                })
            }

            // Refresh data
            await fetchTables()
            handleCloseModals()
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to save table: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
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
                                onDownloadQR={handleDownloadQR}
                                onPrintQR={handlePrintQR}
                                onRegenerateQR={handleRegenerateQR}
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

            {/* Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <TableModal
                    isOpen={isAddModalOpen || isEditModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveTable}
                    table={selectedTable}
                />
            )}

            {/* Regenerate All QR Button - Fixed position at bottom right */}
            {tables.length > 0 && !loading && (
                <button
                    onClick={handleRegenerateAllQR}
                    className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl z-40"
                    title="Regenerate QR codes for all tables"
                >
                    <RefreshCw size={20} />
                    <span className="hidden sm:inline">Regenerate All QR</span>
                    <span className="sm:hidden">Regen All</span>
                </button>
            )}
        </div>
    )
}

// Table Modal Component
function TableModal({
    isOpen,
    onClose,
    onSave,
    table,
}: {
    isOpen: boolean
    onClose: () => void
    onSave: (data: {
        name: string
        capacity: number
        status: TableStatus
        isActive?: boolean
    }) => void
    table: TableWithRestaurant | null
}) {
    const { alert } = useModal()
    const [name, setName] = useState(table?.name || '')
    const [capacity, setCapacity] = useState(table?.capacity?.toString() || '4')
    const [status, setStatus] = useState<TableStatus>(
        (table?.status as TableStatus) || TableStatus.AVAILABLE
    )
    const [isActive, setIsActive] = useState(table?.isActive !== false)

    useEffect(() => {
        if (table) {
            setName(table.name)
            setCapacity(table.capacity?.toString() || '4')
            setStatus((table.status as TableStatus) || TableStatus.AVAILABLE)
            setIsActive(table.isActive !== false)
        } else {
            setName('')
            setCapacity('4')
            setStatus(TableStatus.AVAILABLE)
            setIsActive(true)
        }
    }, [table])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Validation
        const trimmedName = name.trim()
        
        if (!trimmedName) {
            await alert({
                title: 'Validation Error',
                message: 'Table name is required',
                type: 'warning',
            })
            return
        }

        if (trimmedName.length < 1) {
            await alert({
                title: 'Validation Error',
                message: 'Table name must be at least 1 character long',
                type: 'warning',
            })
            return
        }

        if (trimmedName.length > 50) {
            await alert({
                title: 'Validation Error',
                message: 'Table name must not exceed 50 characters',
                type: 'warning',
            })
            return
        }

        const capacityNum = parseInt(capacity)
        if (isNaN(capacityNum) || capacityNum < 1) {
            await alert({
                title: 'Validation Error',
                message: 'Capacity must be at least 1',
                type: 'warning',
            })
            return
        }

        if (capacityNum > 50) {
            await alert({
                title: 'Validation Error',
                message: 'Capacity must not exceed 50',
                type: 'warning',
            })
            return
        }

        onSave({
            name: trimmedName,
            capacity: capacityNum,
            status,
            isActive,
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-slate-900">
                        {table ? 'Edit Table' : 'Add Table'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Table Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Capacity <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as TableStatus)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                        >
                            <option value="AVAILABLE">Available</option>
                            <option value="OCCUPIED">Occupied</option>
                            <option value="RESERVED">Reserved</option>
                        </select>
                    </div>

                    {table && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-2 focus:ring-amber-500"
                            />
                            <label
                                htmlFor="isActive"
                                className="text-sm font-medium text-slate-700 cursor-pointer"
                            >
                                Active (Uncheck to deactivate this table)
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                            {table ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
