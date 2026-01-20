import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react'

export type AlertDialogType = 'info' | 'warning' | 'error' | 'success'

interface AlertDialogProps {
    isOpen: boolean
    title: string
    message: string
    type?: AlertDialogType
    confirmText?: string
    onConfirm: () => void
}

export default function AlertDialog({
    isOpen,
    title,
    message,
    type = 'info',
    confirmText = 'OK',
    onConfirm,
}: AlertDialogProps) {
    const typeConfig = {
        info: {
            icon: Info,
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-100',
            confirmBg: 'bg-blue-500 hover:bg-blue-600',
            borderColor: 'border-blue-200',
        },
        warning: {
            icon: AlertTriangle,
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-100',
            confirmBg: 'bg-amber-500 hover:bg-amber-600',
            borderColor: 'border-amber-200',
        },
        error: {
            icon: XCircle,
            iconColor: 'text-red-500',
            iconBg: 'bg-red-100',
            confirmBg: 'bg-red-500 hover:bg-red-600',
            borderColor: 'border-red-200',
        },
        success: {
            icon: CheckCircle2,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-100',
            confirmBg: 'bg-emerald-500 hover:bg-emerald-600',
            borderColor: 'border-emerald-200',
        },
    }

    const config = typeConfig[type]
    const Icon = config.icon

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onConfirm}
                        className="fixed inset-0 backdrop-blur-md z-[9998]"
                    />

                    {/* Dialog */}
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', duration: 0.3 }}
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full pointer-events-auto border-2 border-slate-200"
                        >
                            {/* Header */}
                            <div className="flex items-start gap-4 p-6 border-b border-slate-200">
                                <div className={`p-3 rounded-full ${config.iconBg} flex-shrink-0`}>
                                    <Icon size={24} className={config.iconColor} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-semibold text-slate-900 mb-1">
                                        {title}
                                    </h3>
                                    <p className="text-sm text-slate-600 whitespace-pre-line">
                                        {message}
                                    </p>
                                </div>
                                <button
                                    onClick={onConfirm}
                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="p-6">
                                <button
                                    onClick={onConfirm}
                                    className={`w-full px-4 py-2.5 ${config.confirmBg} text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
