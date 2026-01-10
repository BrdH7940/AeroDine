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
import { menuItems, categories } from '../../data/mockData'
import type { MenuItem } from '../../data/mockData'

interface ExtendedMenuItem extends MenuItem {
    description?: string
    prepTime?: number
    rating?: number
    reviewCount?: number
    orders?: number
    icon?: string
}

type SortBy = 'popularity' | 'quality' | 'cost' | 'none'
type StatusFilter = 'all' | 'active' | 'inactive'

export default function MenuPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortBy, setSortBy] = useState<SortBy>('none')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [items, setItems] = useState<ExtendedMenuItem[]>(
        menuItems.map((item, index) => ({
            ...item,
            description:
                [
                    'Fresh Atlantic salmon grilled to perfection with herbs and lemon',
                    'Crisp romaine lettuce with parmesan cheese and Caesar dressing',
                    'Classic Italian pizza with fresh mozzarella and basil',
                    'Warm chocolate cake with molten center, served with vanilla ice cream',
                    'Juicy beef patty with fresh vegetables and special sauce',
                    'Fresh mozzarella, tomatoes, and basil with balsamic glaze',
                    'Traditional pizza with spicy pepperoni and mozzarella cheese',
                    'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
                    'Creamy pasta with tender chicken in a rich tomato sauce',
                    'Fresh vegetables, feta cheese, olives, and Greek dressing',
                ][index] || 'Delicious dish prepared with fresh ingredients',
            prepTime: [15, 8, 20, 12, 18, 10, 20, 15, 22, 10][index] || 15,
            rating:
                [4.2, 4.5, 4.8, 4.7, 4.3, 4.4, 4.6, 4.9, 4.5, 4.6][index] ||
                4.5,
            reviewCount: [24, 18, 35, 22, 28, 15, 30, 27, 20, 19][index] || 20,
            orders: [124, 89, 156, 98, 112, 67, 143, 108, 95, 84][index] || 100,
            icon:
                ['🍽️', '🥗', '🍕', '🍰', '🍔', '🥗', '🍕', '🍰', '🍝', '🥗'][
                    index
                ] || '🍽️',
        }))
    )

    const filteredAndSortedItems = useMemo(() => {
        let result = items.filter((item) => {
            const matchesSearch = item.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            const matchesCategory =
                selectedCategory === 'All' || item.category === selectedCategory
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && item.status === 'active') ||
                (statusFilter === 'inactive' && item.status === 'inactive')
            return matchesSearch && matchesCategory && matchesStatus
        })

        if (sortBy !== 'none') {
            result = [...result].sort((a, b) => {
                if (sortBy === 'popularity') {
                    return (b.orders || 0) - (a.orders || 0)
                } else if (sortBy === 'quality') {
                    return (b.rating || 0) - (a.rating || 0)
                } else if (sortBy === 'cost') {
                    return b.price - a.price
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

    const handleRowClick = (item: ExtendedMenuItem) => {
        // Mock: Just alert for now
        alert(
            `Edit Item: ${item.name}\nPrice: $${item.price}\nCategory: ${item.category}`
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
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base text-slate-900 font-medium cursor-pointer"
                >
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category}
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
                    <option value="active">Available</option>
                    <option value="inactive">Sold out</option>
                </select>

                {/* Sort by */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base text-slate-900 font-medium cursor-pointer"
                >
                    <option value="none">Sort by: None</option>
                    <option value="popularity">Sort by: Popularity</option>
                    <option value="quality">Sort by: Quality</option>
                    <option value="cost">Sort by: Cost</option>
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
                                <span className="text-6xl">
                                    {item.icon || '🍽️'}
                                </span>
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
                                            item.status === 'active'
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {item.status === 'active'
                                            ? 'Available'
                                            : 'Sold out'}
                                    </span>
                                </div>

                                {/* Category */}
                                <p className="text-base text-slate-500">
                                    {item.category}
                                </p>

                                {/* Description */}
                                <p className="text-base text-slate-600 line-clamp-2">
                                    {item.description}
                                </p>

                                {/* Price and Prep Time */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-semibold text-red-600">
                                        ${item.price.toFixed(2)}
                                    </span>
                                    <div className="flex items-center gap-1 text-base text-slate-500">
                                        <Clock size={16} />
                                        <span>{item.prepTime} min</span>
                                    </div>
                                </div>

                                {/* Rating and Orders */}
                                <div className="flex items-center gap-2 text-base text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Star
                                            size={16}
                                            className="fill-amber-400 text-amber-400"
                                        />
                                        <span>{item.rating}</span>
                                        <span>({item.reviewCount})</span>
                                    </div>
                                    <span>{item.orders} orders</span>
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
                                            if (
                                                confirm(`Delete ${item.name}?`)
                                            ) {
                                                setItems(
                                                    items.filter(
                                                        (i) => i.id !== item.id
                                                    )
                                                )
                                            }
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
