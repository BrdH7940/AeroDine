import { useState, useMemo, useEffect } from 'react'
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Clock,
    Star,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { menusApi } from '../../services/api'

interface MenuItem {
    id: number
    restaurantId: number
    categoryId: number
    name: string
    description?: string
    basePrice: number
    image?: string
    prepTime?: number
    isAvailable: boolean
    category?: {
        id: number
        name: string
    }
}

interface Category {
    id: number
    restaurantId: number
    name: string
    description?: string
    displayOrder?: number
}

type SortBy = 'price-high' | 'price-low' | 'name' | 'none'
type StatusFilter = 'all' | 'available' | 'unavailable'

export default function MenuPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortBy, setSortBy] = useState<SortBy>('none')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [items, setItems] = useState<MenuItem[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const restaurantId = 1 // TODO: Get from context/auth

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [menuItemsData, categoriesData] = await Promise.all([
                menusApi.getMenuItems(restaurantId),
                menusApi.getCategories(restaurantId),
            ])

            setItems(menuItemsData || [])
            setCategories(categoriesData || [])
        } catch (err: any) {
            console.error('Error fetching menu data:', err)
            setError('Unable to load menu data. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const filteredAndSortedItems = useMemo(() => {
        let result = items.filter((item) => {
            const matchesSearch = item.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
                (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
            const matchesCategory =
                selectedCategory === 'all' || item.categoryId === selectedCategory
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'available' && item.isAvailable) ||
                (statusFilter === 'unavailable' && !item.isAvailable)
            return matchesSearch && matchesCategory && matchesStatus
        })

        if (sortBy !== 'none') {
            result = [...result].sort((a, b) => {
                if (sortBy === 'price-high') {
                    return Number(b.basePrice) - Number(a.basePrice)
                } else if (sortBy === 'price-low') {
                    return Number(a.basePrice) - Number(b.basePrice)
                } else if (sortBy === 'name') {
                    return a.name.localeCompare(b.name)
                }
                return 0
            })
        }

        return result
    }, [items, searchQuery, selectedCategory, statusFilter, sortBy])

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedItems = filteredAndSortedItems.slice(startIndex, endIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedCategory, statusFilter, sortBy])

    const handleRowClick = (item: MenuItem) => {
        // TODO: Open edit modal
        alert(
            `Edit Item: ${item.name}\nPrice: $${Number(item.basePrice).toFixed(2)}\nCategory: ${item.category?.name || 'N/A'}`
        )
    }

    const handleDelete = async (item: MenuItem) => {
        if (!confirm(`Are you sure you want to delete ${item.name}?`)) {
            return
        }
        // TODO: Implement delete functionality
        alert('Delete functionality will be implemented')
    }

    const getCategoryIcon = (categoryName?: string) => {
        if (!categoryName) return '🍽️'
        const name = categoryName.toLowerCase()
        if (name.includes('pizza')) return '🍕'
        if (name.includes('salad')) return '🥗'
        if (name.includes('dessert')) return '🍰'
        if (name.includes('burger')) return '🍔'
        if (name.includes('pasta')) return '🍝'
        if (name.includes('drink')) return '🥤'
        return '🍽️'
    }

    if (loading) {
        return (
            <div className="p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                        <p className="mt-4 text-slate-500">Loading menu...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        Menu management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage your restaurant menu items
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md">
                    <Plus size={20} />
                    Add item
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search
                        size={20}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                    />
                </div>

                {/* Category Filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base text-slate-900 font-medium cursor-pointer"
                >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(e.target.value as StatusFilter)
                    }
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base text-slate-900 font-medium cursor-pointer"
                >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                </select>

                {/* Sort by */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base text-slate-900 font-medium cursor-pointer"
                >
                    <option value="none">Sort by: None</option>
                    <option value="name">Sort by: Name</option>
                    <option value="price-high">Sort by: Price (High)</option>
                    <option value="price-low">Sort by: Price (Low)</option>
                </select>
            </div>

            {/* Grid Layout */}
            {filteredAndSortedItems.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <p className="text-base text-slate-500">No items found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {paginatedItems.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Image/Icon Section */}
                            <div className="h-32 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-6xl">
                                        {getCategoryIcon(item.category?.name)}
                                    </span>
                                )}
                            </div>

                            {/* Content Section */}
                            <div className="p-4 space-y-3">
                                {/* Name and Status */}
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-xl font-semibold text-slate-900 flex-1">
                                        {item.name}
                                    </h3>
                                    <span
                                        className={`text-base font-medium whitespace-nowrap ${
                                            item.isAvailable
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {item.isAvailable
                                            ? 'Available'
                                            : 'Unavailable'}
                                    </span>
                                </div>

                                {/* Category */}
                                <p className="text-base text-slate-500">
                                    {item.category?.name || 'Uncategorized'}
                                </p>

                                {/* Description */}
                                {item.description && (
                                    <p className="text-base text-slate-600 line-clamp-2">
                                        {item.description}
                                    </p>
                                )}

                                {/* Price and Prep Time */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-semibold text-red-600">
                                        ${Number(item.basePrice).toFixed(2)}
                                    </span>
                                    {item.prepTime && (
                                        <div className="flex items-center gap-1 text-base text-slate-500">
                                            <Clock size={16} />
                                            <span>{item.prepTime} min</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={() => handleRowClick(item)}
                                        className="flex-1 p-2 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors flex items-center justify-center"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelete(item)
                                        }}
                                        className="flex-1 p-2 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-lg transition-colors flex items-center justify-center"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {filteredAndSortedItems.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-base text-slate-500">
                        Showing {startIndex + 1} -{' '}
                        {Math.min(endIndex, filteredAndSortedItems.length)} of{' '}
                        {filteredAndSortedItems.length} items
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                setCurrentPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={currentPage === 1}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} className="text-slate-600" />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from(
                                { length: totalPages },
                                (_, i) => i + 1
                            ).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 rounded-lg text-base font-medium transition-colors ${
                                        currentPage === page
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() =>
                                setCurrentPage((prev) =>
                                    Math.min(totalPages, prev + 1)
                                )
                            }
                            disabled={currentPage === totalPages}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight
                                size={20}
                                className="text-slate-600"
                            />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
