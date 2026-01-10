import { useState, useEffect } from 'react'
import { Plus, Mail, Phone, User as UserIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '../../services/api'

// User role types
type UserRoleType = 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CUSTOMER'

interface StaffMember {
    id: number
    email: string
    fullName: string
    role: UserRoleType | string
    createdAt: string
    updatedAt: string
    phone?: string // Optional, will use mock data if not available
}

// Map role types to Vietnamese role names
const roleMap: Record<string, string> = {
    ADMIN: 'ADMIN',
    KITCHEN: 'CHIEF',
    WAITER: 'WAITER',
    CUSTOMER: 'CUSTOMERS',
}

// Mock phone numbers for display (in real app, this would come from user profile)
const mockPhones: Record<number, string> = {}

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
}

function getPhoneNumber(userId: number): string {
    if (mockPhones[userId]) {
        return mockPhones[userId]
    }
    // Generate a mock phone number based on user ID for demo
    const phone = `090.${String(userId).padStart(3, '0')}.${String(
        userId * 7
    ).slice(-4)}`
    mockPhones[userId] = phone
    return phone
}

function StaffCard({ staff }: { staff: StaffMember }) {
    const initials = getInitials(staff.fullName)
    const roleName = roleMap[staff.role] || staff.role
    const phone = getPhoneNumber(staff.id)

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
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone size={16} className="text-slate-400" />
                            <span>{phone}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export default function StaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchStaff()
    }, [])

    const fetchStaff = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await apiClient.get('/users')
            // Filter out CUSTOMER role users for staff management
            const staffMembers =
                response.data?.filter(
                    (user: StaffMember) => String(user.role) !== 'CUSTOMER'
                ) || []
            if (staffMembers.length > 0) {
                setStaff(staffMembers)
            } else {
                // Use mock data if no staff found
                setStaff(getMockStaff())
            }
        } catch (err: any) {
            console.error('Error fetching staff:', err)
            setError('Cannot load staff list. Using mock data.')
            // Use mock data as fallback
            setStaff(getMockStaff())
        } finally {
            setLoading(false)
        }
    }

    const getMockStaff = (): StaffMember[] => [
        {
            id: 1,
            email: 'nam.le@aerodine.com',
            fullName: 'Lê Hoàng Nam',
            role: 'ADMIN' as UserRoleType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 2,
            email: 'ngoc.tran@aerodine.com',
            fullName: 'Trần Bích Ngọc',
            role: 'KITCHEN' as UserRoleType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 3,
            email: 'duc.ng@aerodine.com',
            fullName: 'Nguyễn Minh Đức',
            role: 'WAITER' as UserRoleType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 4,
            email: 'thuy.p@aerodine.com',
            fullName: 'Phạm Thu Thủy',
            role: 'WAITER' as UserRoleType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ]

    const handleAddStaff = () => {
        // TODO: Open add staff modal/form
        alert('Add staff functionality will be implemented')
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
                        <StaffCard key={member.id} staff={member} />
                    ))}
                </div>
            )}
        </div>
    )
}
