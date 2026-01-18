import { useState, useEffect } from 'react'
import { Plus, Mail, Phone, User as UserIcon, Edit, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient, usersApi } from '../../services/api'
import { useModal } from '../../contexts/ModalContext'

// User role types
type UserRoleType = 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CUSTOMER'

interface StaffMember {
    id: number
    email: string
    fullName: string
    role: UserRoleType | string
    createdAt: string
    updatedAt: string
    phone?: string
}

// Map role types to Vietnamese role names
const roleMap: Record<string, string> = {
    ADMIN: 'ADMIN',
    KITCHEN: 'CHIEF',
    WAITER: 'WAITER',
    CUSTOMER: 'CUSTOMERS',
}

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
}

function StaffCard({ 
    staff, 
    onEdit, 
    onDelete 
}: { 
    staff: StaffMember
    onEdit: (staff: StaffMember) => void
    onDelete: (staff: StaffMember) => void
}) {
    const initials = getInitials(staff.fullName)
    const roleName = roleMap[staff.role] || staff.role

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-100"
        >
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center">
                        <span className="text-2xl font-bold text-amber-400">
                            {initials}
                        </span>
                    </div>
                    {/* Status indicator */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {staff.fullName}
                    </h3>
                    <p className="text-sm font-medium text-amber-600 mb-3">
                        {roleName}
                    </p>

                    {/* Contact Info */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail size={16} className="text-slate-400" />
                            <span className="truncate">{staff.email}</span>
                        </div>
                        {staff.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone size={16} className="text-slate-400" />
                                <span>{staff.phone}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100">
                        <button
                            onClick={() => onEdit(staff)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Edit size={16} />
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(staff)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export default function StaffPage() {
    const { confirm, alert } = useModal()
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)

    useEffect(() => {
        fetchStaff()
    }, [])

    const fetchStaff = async () => {
        try {
            setLoading(true)
            setError(null)
            const usersData = await usersApi.getUsers()
            // Filter out CUSTOMER role users for staff management
            const staffMembers =
                Array.isArray(usersData)
                    ? usersData.filter(
                          (user: StaffMember) => String(user.role) !== 'CUSTOMER'
                      )
                    : []
            setStaff(staffMembers)
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Authentication required. Please login.')
            } else if (err.response?.status === 404) {
                setError('Backend endpoint not found. Please check if backend is running.')
            } else {
                setError(`Unable to load staff list: ${err.response?.data?.message || err.message || 'Unknown error'}`)
            }
            setStaff([])
        } finally {
            setLoading(false)
        }
    }

    const handleAddStaff = () => {
        setSelectedStaff(null)
        setIsAddModalOpen(true)
    }

    const handleEdit = (staffMember: StaffMember) => {
        setSelectedStaff(staffMember)
        setIsEditModalOpen(true)
    }

    const handleDelete = async (staffMember: StaffMember) => {
        const confirmed = await confirm({
            title: 'Delete Staff Member',
            message: `Are you sure you want to delete ${staffMember.fullName}? This action cannot be undone.`,
            type: 'warning',
            confirmText: 'Delete',
            cancelText: 'Cancel',
        })
        if (!confirmed) {
            return
        }

        try {
            await usersApi.deleteUser(staffMember.id)
            setStaff(staff.filter((s) => s.id !== staffMember.id))
            await alert({
                title: 'Success',
                message: `Staff member "${staffMember.fullName}" has been deleted successfully.`,
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to delete staff: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        }
    }

    const handleCloseModals = () => {
        setIsAddModalOpen(false)
        setIsEditModalOpen(false)
        setSelectedStaff(null)
    }

    const handleSaveStaff = async (formData: {
        email: string
        password?: string
        name: string
        role: string
    }) => {
        try {
            if (selectedStaff) {
                // Update existing staff
                await usersApi.updateUser(selectedStaff.id, {
                    email: formData.email,
                    fullName: formData.name,
                    role: formData.role,
                })
            } else {
                // Create new staff
                if (!formData.password) {
                    await alert({
                        title: 'Validation Error',
                        message: 'Password is required for new staff members',
                        type: 'warning',
                    })
                    return
                }
                await usersApi.createUser({
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.name,
                    role: formData.role,
                })
            }

            // Refresh data
            await fetchStaff()
            handleCloseModals()
            await alert({
                title: 'Success',
                message: `Staff member "${formData.name}" has been ${selectedStaff ? 'updated' : 'created'} successfully.`,
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to save staff: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        }
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        Staff Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage and assign roles to staff members
                    </p>
                </div>
                <button
                    onClick={handleAddStaff}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
                >
                    <UserIcon size={20} />
                    <Plus size={20} />
                    <span>Add Staff</span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Staff Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 animate-pulse"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-lg bg-slate-200"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : staff.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <UserIcon
                        size={48}
                        className="mx-auto text-slate-400 mb-4"
                    />
                    <p className="text-base text-slate-500">No staff found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {staff.map((member) => (
                        <StaffCard 
                            key={member.id} 
                            staff={member}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <StaffModal
                    isOpen={isAddModalOpen || isEditModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveStaff}
                    staff={selectedStaff}
                />
            )}
        </div>
    )
}

// Staff Modal Component
function StaffModal({
    isOpen,
    onClose,
    onSave,
    staff,
}: {
    isOpen: boolean
    onClose: () => void
    onSave: (data: {
        email: string
        password?: string
        name: string
        role: string
    }) => void
    staff: StaffMember | null
}) {
    const { alert } = useModal()
    const [email, setEmail] = useState(staff?.email || '')
    const [password, setPassword] = useState('')
    const [name, setName] = useState(staff?.fullName || '')
    const [role, setRole] = useState<string>(staff?.role || 'WAITER')

    useEffect(() => {
        if (staff) {
            setEmail(staff.email)
            setPassword('') // Don't show password for existing users
            setName(staff.fullName)
            setRole(staff.role)
        } else {
            setEmail('')
            setPassword('')
            setName('')
            setRole('WAITER')
        }
    }, [staff])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !name || !role) {
            await alert({
                title: 'Validation Error',
                message: 'Please fill in all required fields',
                type: 'warning',
            })
            return
        }
        if (!staff && !password) {
            await alert({
                title: 'Validation Error',
                message: 'Password is required for new staff members',
                type: 'warning',
            })
            return
        }
        onSave({
            email,
            password: password || undefined,
            name,
            role,
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-slate-900">
                        {staff ? 'Edit Staff Member' : 'Add Staff Member'}
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
                            Full Name <span className="text-red-500">*</span>
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
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>

                    {!staff && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required={!staff}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                        >
                            <option value="ADMIN">Admin</option>
                            <option value="WAITER">Waiter</option>
                            <option value="KITCHEN">Kitchen</option>
                        </select>
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
                            {staff ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
