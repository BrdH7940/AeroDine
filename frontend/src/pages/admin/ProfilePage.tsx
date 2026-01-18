import { useState, useEffect } from 'react'
import { Building2, MapPin, Save, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { restaurantsApi, type Restaurant, type UpdateRestaurantDto } from '../../services/api'
import { useModal } from '../../contexts/ModalContext'

export default function ProfilePage() {
    const { alert } = useModal()
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    // Form state
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [isActive, setIsActive] = useState(true)

    useEffect(() => {
        fetchRestaurant()
    }, [])

    const fetchRestaurant = async () => {
        try {
            setLoading(true)
            setError(null)
            // Get first restaurant (assuming single restaurant system)
            const restaurants = await restaurantsApi.getRestaurants()
            if (restaurants.length > 0) {
                const restaurantData = restaurants[0]
                setRestaurant(restaurantData)
                setName(restaurantData.name)
                setAddress(restaurantData.address || '')
                setIsActive(restaurantData.isActive)
            } else {
                setError('No restaurant found')
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Authentication required. Please login.')
            } else if (err.response?.status === 404) {
                setError('Restaurant not found.')
            } else {
                setError(`Unable to load restaurant: ${err.response?.data?.message || err.message || 'Unknown error'}`)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!restaurant) return

        if (!name.trim()) {
            await alert({
                title: 'Validation Error',
                message: 'Restaurant name is required',
                type: 'warning',
            })
            return
        }

        try {
            setSaving(true)
            setError(null)
            const updateData: UpdateRestaurantDto = {
                name: name.trim(),
                address: address.trim() || undefined,
                isActive,
            }
            const updated = await restaurantsApi.updateRestaurant(restaurant.id, updateData)
            setRestaurant(updated)
            await alert({
                title: 'Success',
                message: 'Restaurant profile has been updated successfully.',
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to update restaurant: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6 lg:p-8">
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 text-amber-500 animate-spin mb-4" />
                    <p className="text-slate-500">Loading restaurant profile...</p>
                </div>
            </div>
        )
    }

    if (error && !restaurant) {
        return (
            <div className="p-6 lg:p-8">
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-slate-900">
                    Restaurant Profile
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Manage your restaurant information and settings
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Profile Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border border-slate-200"
            >
                <form onSubmit={handleSave} className="p-6 lg:p-8 space-y-6">
                    {/* Restaurant Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Building2 className="inline-block mr-2" size={16} />
                            Restaurant Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="Enter restaurant name"
                            required
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <MapPin className="inline-block mr-2" size={16} />
                            Address
                        </label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                            placeholder="Enter restaurant address"
                        />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Restaurant Status
                            </label>
                            <p className="text-xs text-slate-500">
                                {isActive 
                                    ? 'Restaurant is currently active and visible to customers'
                                    : 'Restaurant is deactivated and hidden from customers'
                                }
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsActive(!isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isActive ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                        <div className="flex items-center gap-2">
                            {isActive ? (
                                <>
                                    <CheckCircle2 size={20} className="text-green-500" />
                                    <span className="text-sm font-medium text-green-700">Active</span>
                                </>
                            ) : (
                                <>
                                    <XCircle size={20} className="text-red-500" />
                                    <span className="text-sm font-medium text-red-700">Inactive</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Restaurant Info (Read-only) */}
                    {restaurant && (
                        <div className="pt-4 border-t border-slate-200 space-y-2">
                            <div className="text-sm text-slate-500">
                                <span className="font-medium">Restaurant ID:</span> {restaurant.id}
                            </div>
                            <div className="text-sm text-slate-500">
                                <span className="font-medium">Created:</span>{' '}
                                {new Date(restaurant.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-slate-500">
                                <span className="font-medium">Last Updated:</span>{' '}
                                {new Date(restaurant.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
