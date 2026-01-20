import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Camera, Save, Loader2, Lock, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { usersApi, type UpdateUserDto } from '../../services/api'
import { authService } from '../../services/auth.service'
import { useUserStore } from '../../store/userStore'
import { useModal } from '../../contexts/ModalContext'
import { BottomNavigation } from '../../components/customer'

interface UserProfile {
    id: number
    email: string
    fullName: string
    avatar?: string | null
    role: string
    createdAt: string
    updatedAt: string
}

export default function CustomerProfilePage() {
    const navigate = useNavigate()
    const { alert } = useModal()
    const { user: currentUser, setUser } = useUserStore()
    const [user, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    // Form state
    const [fullName, setFullName] = useState('')
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPasswordSection, setShowPasswordSection] = useState(false)

    useEffect(() => {
        if (!currentUser) {
            navigate('/auth/login')
            return
        }
        fetchUserProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id, navigate])

    const fetchUserProfile = async () => {
        if (!currentUser?.id) return
        
        try {
            setLoading(true)
            setError(null)
            const userData = await usersApi.getUserById(currentUser.id)
            setUserProfile(userData)
            setFullName(userData.fullName || '')
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Authentication required. Please login.')
                navigate('/auth/login')
            } else {
                setError(`Unable to load profile: ${err.response?.data?.message || err.message || 'Unknown error'}`)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        // Validate file type
        if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
            await alert({
                title: 'Invalid File',
                message: 'Please select a valid image file (JPG, PNG, GIF, or WebP)',
                type: 'error',
            })
            return
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            await alert({
                title: 'File Too Large',
                message: 'Image size must be less than 5MB',
                type: 'error',
            })
            return
        }

        try {
            setUploadingAvatar(true)
            setError(null)
            const updatedUser = await usersApi.uploadAvatar(user.id, file)
            setUserProfile(updatedUser)
            
            // Update user store
            if (currentUser) {
                setUser({ ...currentUser, avatar: updatedUser.avatar })
            }
            
            await alert({
                title: 'Success',
                message: 'Avatar has been updated successfully.',
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to upload avatar: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        } finally {
            setUploadingAvatar(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        // Frontend validation
        const trimmedName = fullName.trim()
        
        if (!trimmedName) {
            await alert({
                title: 'Validation Error',
                message: 'Full name is required',
                type: 'warning',
            })
            return
        }

        if (trimmedName.length < 1) {
            await alert({
                title: 'Validation Error',
                message: 'Full name must be at least 1 character long',
                type: 'warning',
            })
            return
        }

        if (trimmedName.length > 100) {
            await alert({
                title: 'Validation Error',
                message: 'Full name must not exceed 100 characters',
                type: 'warning',
            })
            return
        }

        // Validate name format (letters, spaces, hyphens, apostrophes)
        if (!/^[a-zA-Z\s\u00C0-\u1FFF\u2C00-\uD7FF'-]+$/.test(trimmedName)) {
            await alert({
                title: 'Validation Error',
                message: 'Full name can only contain letters, spaces, hyphens, and apostrophes',
                type: 'warning',
            })
            return
        }

        try {
            setSaving(true)
            setError(null)
            const updateData: UpdateUserDto = {
                fullName: trimmedName,
            }
            const updated = await usersApi.updateUser(user.id, updateData)
            setUserProfile(updated)
            
            // Update user store
            if (currentUser) {
                setUser({ ...currentUser, fullName: updated.fullName })
            }
            
            await alert({
                title: 'Success',
                message: 'Profile has been updated successfully.',
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: `Unable to update profile: ${err.response?.data?.message || err.message || 'Unknown error'}`,
                type: 'error',
            })
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            await alert({
                title: 'Validation Error',
                message: 'All password fields are required',
                type: 'warning',
            })
            return
        }

        if (newPassword.length < 8) {
            await alert({
                title: 'Validation Error',
                message: 'New password must be at least 8 characters long',
                type: 'warning',
            })
            return
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            await alert({
                title: 'Validation Error',
                message: 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
                type: 'warning',
            })
            return
        }

        if (newPassword !== confirmPassword) {
            await alert({
                title: 'Validation Error',
                message: 'New password and confirm password do not match',
                type: 'warning',
            })
            return
        }

        try {
            setSaving(true)
            setError(null)
            await authService.changePassword({
                oldPassword,
                newPassword,
            })
            
            // Clear password fields
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setShowPasswordSection(false)
            
            await alert({
                title: 'Success',
                message: 'Password has been changed successfully.',
                type: 'success',
            })
        } catch (err: any) {
            await alert({
                title: 'Error',
                message: err.response?.data?.message || err.message || 'Unable to change password',
                type: 'error',
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F7F2] pb-20">
                <div className="p-5 py-8">
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <Loader2 className="mx-auto h-8 w-8 text-[#8A9A5B] animate-spin mb-4" />
                        <p className="text-[#36454F]">Loading profile...</p>
                    </div>
                </div>
                <BottomNavigation />
            </div>
        )
    }

    if (error && !user) {
        return (
            <div className="min-h-screen bg-[#F9F7F2] pb-20">
                <div className="p-5 py-8">
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                </div>
                <BottomNavigation />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F9F7F2] pb-20">
            {/* Header */}
            <div className="bg-[#8A9A5B] border-b border-[#8A9A5B]/20 shadow-sm">
                <div className="p-5">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-white hover:text-[#D4AF37] transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="font-semibold text-white">Profile</span>
                        <div className="w-6"></div>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-6">
                {/* Error Message */}
                {error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Avatar Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-6 border border-[#8A9A5B]/20 shadow-sm"
                >
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-[#8A9A5B]/20 flex items-center justify-center overflow-hidden">
                                {user?.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.fullName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-12 h-12 text-[#8A9A5B]" />
                                )}
                            </div>
                            <button
                                onClick={handleAvatarClick}
                                disabled={uploadingAvatar}
                                className="absolute bottom-0 right-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white hover:bg-[#B8941F] transition-colors disabled:opacity-50"
                            >
                                {uploadingAvatar ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Camera className="w-4 h-4" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>
                        <p className="mt-4 text-sm text-[#36454F] font-medium">{user?.fullName}</p>
                        <p className="text-xs text-[#36454F]/70">{user?.email}</p>
                    </div>
                </motion.div>

                {/* Profile Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-6 border border-[#8A9A5B]/20 shadow-sm"
                >
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <h2 className="text-lg font-semibold text-[#36454F] mb-4">Profile Information</h2>
                        
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-[#36454F] mb-2">
                                <User className="inline-block mr-2" size={16} />
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-2 border border-[#8A9A5B]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                                placeholder="Enter your full name"
                                required
                                minLength={1}
                                maxLength={100}
                            />
                            <p className="text-xs text-[#36454F]/50 mt-1">
                                {fullName.length}/100 characters
                            </p>
                        </div>

                        {/* Email (Read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-[#36454F] mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-2 border border-[#8A9A5B]/30 rounded-lg bg-[#F9F7F2] text-[#36454F]/70 cursor-not-allowed"
                            />
                            <p className="text-xs text-[#36454F]/50 mt-1">Email cannot be changed</p>
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 border-t border-[#8A9A5B]/20">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Password Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-6 border border-[#8A9A5B]/20 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[#36454F] flex items-center gap-2">
                            <Lock size={20} />
                            Change Password
                        </h2>
                        <button
                            onClick={() => {
                                setShowPasswordSection(!showPasswordSection)
                                if (showPasswordSection) {
                                    setOldPassword('')
                                    setNewPassword('')
                                    setConfirmPassword('')
                                }
                            }}
                            className="text-[#8A9A5B] hover:text-[#D4AF37] transition-colors"
                        >
                            {showPasswordSection ? (
                                <X size={20} />
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {showPasswordSection && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#36454F] mb-2">
                                    Current Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-[#8A9A5B]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#36454F] mb-2">
                                    New Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-[#8A9A5B]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                                    placeholder="Enter new password (min 8 characters)"
                                    required
                                />
                                <p className="text-xs text-[#36454F]/50 mt-1">
                                    Must contain uppercase, lowercase, and number
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#36454F] mb-2">
                                    Confirm New Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-[#8A9A5B]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>

                            <div className="pt-4 border-t border-[#8A9A5B]/20">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#8A9A5B] hover:bg-[#6B7A4B] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Changing...
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={20} />
                                            Change Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>

                {/* Account Info */}
                {user && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-6 border border-[#8A9A5B]/20 shadow-sm"
                    >
                        <h2 className="text-lg font-semibold text-[#36454F] mb-4">Account Information</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#36454F]/70">Member since:</span>
                                <span className="text-[#36454F] font-medium">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#36454F]/70">Last updated:</span>
                                <span className="text-[#36454F] font-medium">
                                    {new Date(user.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            <BottomNavigation />
        </div>
    )
}
