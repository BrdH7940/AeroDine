import { useState, useMemo, useEffect } from 'react'
import {
    Search,
    Plus,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Fuse from 'fuse.js'
import { menusApi, tablesApi } from '../../services/api'
import { authService } from '../../services/auth.service'
import { useModal } from '../../contexts/ModalContext'

interface MenuItem {
    id: number
    restaurantId: number
    categoryId: number
    name: string
    description?: string | null
    basePrice: string | number // Prisma Decimal is serialized as string
    status: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN' // ItemStatus enum from Prisma
    createdAt?: string | Date
    updatedAt?: string | Date
    images?: Array<{
        id: number
        url: string
        rank: number
    }>
    category?: {
        id: number
        restaurantId: number
        name: string
        image?: string | null
        rank: number
    }
    modifierGroups?: Array<{
        modifierGroup: {
            id: number
            name: string
        }
    }>
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
    const { confirm, alert } = useModal()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<number | 'all'>(
        'all'
    )
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortBy, setSortBy] = useState<SortBy>('none')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [items, setItems] = useState<MenuItem[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [modifierGroups, setModifierGroups] = useState<Array<{ id: number; name: string }>>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [restaurantId, setRestaurantId] = useState<number | null>(null)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

    useEffect(() => {
        initializeAndFetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Only run once on mount

    const initializeAndFetchData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Auto-login in development mode if not authenticated
            if (import.meta.env.DEV && !authService.isAuthenticated()) {
                try {
                    await authService.autoLoginDev()
                } catch (loginError) {
                    // Auto-login failed, continue without auth
                }
            }

            // Get restaurant ID from tables (first table's restaurantId)
            // If no tables found, use fallback restaurantId = 2 (matches current database)
            if (!restaurantId) {
                try {
                    const tables = await tablesApi.getTables()
                    if (
                        tables &&
                        Array.isArray(tables) &&
                        tables.length > 0 &&
                        tables[0].restaurantId
                    ) {
                        const firstRestaurantId = tables[0].restaurantId
                        setRestaurantId(firstRestaurantId)
                        await fetchData(firstRestaurantId)
                    } else {
                        // Fallback: use restaurantId = 2 (matches current database)
                        setRestaurantId(2)
                        await fetchData(2)
                    }
                } catch (tableError) {
                    setRestaurantId(2)
                    await fetchData(2)
                }
            } else {
                await fetchData(restaurantId)
            }
        } catch (err: any) {
            setError(
                `Unable to load menu data: ${
                    err.response?.data?.message ||
                    err.message ||
                    'Please check if backend is running.'
                }`
            )
        } finally {
            setLoading(false)
        }
    }

    const fetchData = async (id?: number) => {
        const targetRestaurantId = id || restaurantId
        if (!targetRestaurantId) {
            setError(
                'Restaurant ID not found. Please check database configuration.'
            )
            return
        }

        try {
            const [menuItemsData, categoriesData, modifierGroupsData] = await Promise.all([
                menusApi.getMenuItems(targetRestaurantId),
                menusApi.getCategories(targetRestaurantId),
                menusApi.getModifierGroups(targetRestaurantId),
            ])

            // Ensure we're setting arrays
            const itemsArray = Array.isArray(menuItemsData) ? menuItemsData : []
            const categoriesArray = Array.isArray(categoriesData)
                ? categoriesData
                : []
            const modifierGroupsArray = Array.isArray(modifierGroupsData)
                ? modifierGroupsData
                : []

            setItems(itemsArray)
            setCategories(categoriesArray)
            setModifierGroups(modifierGroupsArray)
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Authentication required. Please login.')
            } else if (err.response?.status === 404) {
                setError(
                    'Backend endpoint not found. Please check if backend is running.'
                )
            } else {
                setError(
                    `Unable to load menu data: ${
                        err.response?.data?.message ||
                        err.message ||
                        'Unknown error'
                    }`
                )
            }
            throw err
        }
    }

    const filteredAndSortedItems = useMemo(() => {
        // First filter by category and status
        let result = items.filter((item) => {
            const matchesCategory =
                selectedCategory === 'all' ||
                item.categoryId === Number(selectedCategory)
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'available' && item.status === 'AVAILABLE') ||
                (statusFilter === 'unavailable' && item.status !== 'AVAILABLE')

            return matchesCategory && matchesStatus
        })

        // Apply fuzzy search if there's a search query
        if (searchQuery.trim() !== '') {
            const fuse = new Fuse(result, {
                keys: [
                    { name: 'name', weight: 0.7 },
                    { name: 'description', weight: 0.3 },
                ],
                threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
                ignoreLocation: true,
                includeScore: true,
                minMatchCharLength: 1,
            })

            const searchResults = fuse.search(searchQuery)
            result = searchResults.map((result) => result.item)
        }

        if (sortBy !== 'none') {
            result = [...result].sort((a, b) => {
                if (sortBy === 'price-high') {
                    const priceA =
                        typeof a.basePrice === 'string'
                            ? parseFloat(a.basePrice)
                            : Number(a.basePrice)
                    const priceB =
                        typeof b.basePrice === 'string'
                            ? parseFloat(b.basePrice)
                            : Number(b.basePrice)
                    return priceB - priceA
                } else if (sortBy === 'price-low') {
                    const priceA =
                        typeof a.basePrice === 'string'
                            ? parseFloat(a.basePrice)
                            : Number(a.basePrice)
                    const priceB =
                        typeof b.basePrice === 'string'
                            ? parseFloat(b.basePrice)
                            : Number(b.basePrice)
                    return priceA - priceB
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
        setSelectedItem(item)
        setIsEditModalOpen(true)
    }

    const handleDelete = async (item: MenuItem) => {
        const confirmed = await confirm({
            title: 'Delete Menu Item',
            message: `Are you sure you want to permanently delete ${item.name}? This action cannot be undone.`,
            type: 'warning',
            confirmText: 'Delete',
            cancelText: 'Cancel',
        })
        if (!confirmed) {
            return
        }
        try {
            await menusApi.deleteMenuItem(item.id)
            // Refresh data
            if (restaurantId) {
                await fetchData(restaurantId)
            }
            await alert({
                title: 'Success',
                message: `Menu item "${item.name}" has been deleted successfully.`,
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to delete menu item: ${
                    err.response?.data?.message ||
                    err.message ||
                    'Unknown error'
                }`,
                type: 'error',
            })
        }
    }

    const handleAddItem = () => {
        setSelectedItem(null)
        setIsAddModalOpen(true)
    }

    const handleCloseModals = () => {
        setIsAddModalOpen(false)
        setIsEditModalOpen(false)
        setSelectedItem(null)
    }

    const handleSaveItem = async (formData: {
        name: string
        description?: string
        basePrice: number
        categoryId: number
        status: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN'
        image?: string
        modifierGroupIds?: number[]
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

            if (selectedItem) {
                // Update existing item
                await menusApi.updateMenuItem(selectedItem.id, {
                    name: formData.name,
                    description: formData.description,
                    basePrice: formData.basePrice,
                    categoryId: formData.categoryId,
                    status: formData.status,
                    image: formData.image,
                    modifierGroupIds: formData.modifierGroupIds,
                })
            } else {
                // Create new item
                await menusApi.createMenuItem({
                    restaurantId,
                    categoryId: formData.categoryId,
                    name: formData.name,
                    description: formData.description,
                    basePrice: formData.basePrice,
                    status: formData.status,
                    image: formData.image,
                    modifierGroupIds: formData.modifierGroupIds,
                })
            }

            // Refresh data
            await fetchData(restaurantId)
            handleCloseModals()
            await alert({
                title: 'Success',
                message: `Menu item "${formData.name}" has been ${selectedItem ? 'updated' : 'created'} successfully.`,
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to save menu item: ${
                    err.response?.data?.message ||
                    err.message ||
                    'Unknown error'
                }`,
                type: 'error',
            })
        }
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
                <button
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
                >
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
                    onChange={(e) =>
                        setSelectedCategory(
                            e.target.value === 'all'
                                ? 'all'
                                : Number(e.target.value)
                        )
                    }
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
                    <p className="text-base text-slate-500">
                        {items.length === 0
                            ? 'No menu items found. Please check if data exists in database.'
                            : 'No items match your filters. Try adjusting your search or filters.'}
                    </p>
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
                                {item.images &&
                                item.images.length > 0 &&
                                item.images[0]?.url ? (
                                    <img
                                        src={item.images[0].url}
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
                                            item.status === 'AVAILABLE'
                                                ? 'text-green-600'
                                                : item.status === 'SOLD_OUT'
                                                ? 'text-red-600'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        {item.status === 'AVAILABLE'
                                            ? 'Available'
                                            : item.status === 'SOLD_OUT'
                                            ? 'Sold Out'
                                            : 'Hidden'}
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

                                {/* Price */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-semibold text-red-600">
                                        $
                                        {typeof item.basePrice === 'string'
                                            ? parseFloat(
                                                  item.basePrice
                                              ).toFixed(2)
                                            : Number(item.basePrice).toFixed(2)}
                                    </span>
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

            {/* Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <MenuItemModal
                    isOpen={isAddModalOpen || isEditModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveItem}
                    item={selectedItem}
                    categories={categories}
                    modifierGroups={modifierGroups}
                />
            )}
        </div>
    )
}

// Menu Item Modal Component
function MenuItemModal({
    isOpen,
    onClose,
    onSave,
    item,
    categories,
    modifierGroups,
}: {
    isOpen: boolean
    onClose: () => void
    onSave: (data: {
        name: string
        description?: string
        basePrice: number
        categoryId: number
        status: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN'
        image?: string
        modifierGroupIds?: number[]
    }) => void
    item: MenuItem | null
    categories: Category[]
    modifierGroups: Array<{ id: number; name: string }>
}) {
    const { alert } = useModal()
    const [name, setName] = useState(item?.name || '')
    const [description, setDescription] = useState(item?.description || '')
    const [basePrice, setBasePrice] = useState(
        item
            ? typeof item.basePrice === 'string'
                ? parseFloat(item.basePrice).toString()
                : Number(item.basePrice).toString()
            : ''
    )
    const [categoryId, setCategoryId] = useState<number>(
        item?.categoryId || categories[0]?.id || 0
    )
    const [status, setStatus] = useState<'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN'>(
        item?.status || 'AVAILABLE'
    )
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(
        item?.images && item.images.length > 0 ? item.images[0].url : null
    )
    const [selectedModifierGroups, setSelectedModifierGroups] = useState<number[]>(
        item?.modifierGroups?.map((mg) => mg.modifierGroup.id) || []
    )

    useEffect(() => {
        if (item) {
            setName(item.name)
            setDescription(item.description || '')
            setBasePrice(
                typeof item.basePrice === 'string'
                    ? parseFloat(item.basePrice).toString()
                    : Number(item.basePrice).toString()
            )
            setCategoryId(item.categoryId)
            setStatus(item.status)
            setImagePreview(item.images && item.images.length > 0 ? item.images[0].url : null)
            setSelectedModifierGroups(item.modifierGroups?.map((mg) => mg.modifierGroup.id) || [])
        } else {
            setName('')
            setDescription('')
            setBasePrice('')
            setCategoryId(categories[0]?.id || 0)
            setStatus('AVAILABLE')
            setImagePreview(null)
            setSelectedModifierGroups([])
        }
        setSelectedImage(null)
    }, [item, categories])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedImage(file)
            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const convertImageToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const base64 = reader.result as string
                // Remove data:image/...;base64, prefix if present
                const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
                resolve(base64Data)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Validation
        const trimmedName = name.trim()
        
        if (!trimmedName) {
            await alert({
                title: 'Validation Error',
                message: 'Item name is required',
                type: 'warning',
            })
            return
        }

        if (trimmedName.length < 1) {
            await alert({
                title: 'Validation Error',
                message: 'Item name must be at least 1 character long',
                type: 'warning',
            })
            return
        }

        if (trimmedName.length > 200) {
            await alert({
                title: 'Validation Error',
                message: 'Item name must not exceed 200 characters',
                type: 'warning',
            })
            return
        }

        if (!basePrice) {
            await alert({
                title: 'Validation Error',
                message: 'Base price is required',
                type: 'warning',
            })
            return
        }

        const priceNum = parseFloat(basePrice)
        if (isNaN(priceNum) || priceNum < 0) {
            await alert({
                title: 'Validation Error',
                message: 'Base price must be a positive number',
                type: 'warning',
            })
            return
        }

        if (!categoryId) {
            await alert({
                title: 'Validation Error',
                message: 'Category is required',
                type: 'warning',
            })
            return
        }

        // Validate description length if provided
        if (description && description.trim().length > 1000) {
            await alert({
                title: 'Validation Error',
                message: 'Description must not exceed 1000 characters',
                type: 'warning',
            })
            return
        }

        let imageBase64: string | undefined
        if (selectedImage) {
            try {
                imageBase64 = await convertImageToBase64(selectedImage)
            } catch (error) {
                await alert({
                    title: 'Error',
                    message: 'Failed to process image. Please try again.',
                    type: 'error',
                })
                return
            }
        }

        onSave({
            name: trimmedName,
            description: description?.trim() || undefined,
            basePrice: priceNum,
            categoryId,
            status,
            image: imageBase64,
            modifierGroupIds: selectedModifierGroups.length > 0 ? selectedModifierGroups : undefined,
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-slate-900">
                        {item ? 'Edit Menu Item' : 'Add Menu Item'}
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
                            Name <span className="text-red-500">*</span>
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
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Price <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={basePrice}
                                onChange={(e) => setBasePrice(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={categoryId}
                                onChange={(e) =>
                                    setCategoryId(Number(e.target.value))
                                }
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={status}
                            onChange={(e) =>
                                setStatus(
                                    e.target.value as
                                        | 'AVAILABLE'
                                        | 'SOLD_OUT'
                                        | 'HIDDEN'
                                )
                            }
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                        >
                            <option value="AVAILABLE">Available</option>
                            <option value="SOLD_OUT">Sold Out</option>
                            <option value="HIDDEN">Hidden</option>
                        </select>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Image
                        </label>
                        {imagePreview && (
                            <div className="mb-2">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-32 h-32 object-cover rounded-lg border border-slate-300"
                                />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    {/* Modifier Groups */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Modifier Groups
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-lg p-2">
                            {modifierGroups.length === 0 ? (
                                <p className="text-sm text-slate-500">No modifier groups available</p>
                            ) : (
                                modifierGroups.map((group) => (
                                    <label
                                        key={group.id}
                                        className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedModifierGroups.includes(group.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedModifierGroups([
                                                        ...selectedModifierGroups,
                                                        group.id,
                                                    ])
                                                } else {
                                                    setSelectedModifierGroups(
                                                        selectedModifierGroups.filter(
                                                            (id) => id !== group.id
                                                        )
                                                    )
                                                }
                                            }}
                                            className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                                        />
                                        <span className="text-sm text-slate-700">{group.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

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
                            {item ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
