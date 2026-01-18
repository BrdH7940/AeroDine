import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import ConfirmDialog, { type ConfirmDialogType } from '../components/common/ConfirmDialog'
import AlertDialog, { type AlertDialogType } from '../components/common/AlertDialog'

interface ConfirmOptions {
    title?: string
    message: string
    type?: ConfirmDialogType
    confirmText?: string
    cancelText?: string
}

interface AlertOptions {
    title?: string
    message: string
    type?: AlertDialogType
    confirmText?: string
}

interface ModalContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>
    alert: (options: AlertOptions) => Promise<void>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        title: string
        message: string
        type: ConfirmDialogType
        confirmText: string
        cancelText: string
        resolve: (value: boolean) => void
    } | null>(null)

    const [alertState, setAlertState] = useState<{
        isOpen: boolean
        title: string
        message: string
        type: AlertDialogType
        confirmText: string
        resolve: () => void
    } | null>(null)

    const confirm = useCallback(
        (options: ConfirmOptions): Promise<boolean> => {
            return new Promise((resolve) => {
                setConfirmState({
                    isOpen: true,
                    title: options.title || 'Confirm',
                    message: options.message,
                    type: options.type || 'warning',
                    confirmText: options.confirmText || 'OK',
                    cancelText: options.cancelText || 'Cancel',
                    resolve,
                })
            })
        },
        []
    )

    const alert = useCallback(
        (options: AlertOptions): Promise<void> => {
            return new Promise((resolve) => {
                setAlertState({
                    isOpen: true,
                    title: options.title || 'Notification',
                    message: options.message,
                    type: options.type || 'info',
                    confirmText: options.confirmText || 'OK',
                    resolve,
                })
            })
        },
        []
    )

    const handleConfirm = useCallback(() => {
        if (confirmState) {
            confirmState.resolve(true)
            setConfirmState(null)
        }
    }, [confirmState])

    const handleCancel = useCallback(() => {
        if (confirmState) {
            confirmState.resolve(false)
            setConfirmState(null)
        }
    }, [confirmState])

    const handleAlertClose = useCallback(() => {
        if (alertState) {
            alertState.resolve()
            setAlertState(null)
        }
    }, [alertState])

    return (
        <ModalContext.Provider value={{ confirm, alert }}>
            {children}
            {confirmState && (
                <ConfirmDialog
                    isOpen={confirmState.isOpen}
                    title={confirmState.title}
                    message={confirmState.message}
                    type={confirmState.type}
                    confirmText={confirmState.confirmText}
                    cancelText={confirmState.cancelText}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
            {alertState && (
                <AlertDialog
                    isOpen={alertState.isOpen}
                    title={alertState.title}
                    message={alertState.message}
                    type={alertState.type}
                    confirmText={alertState.confirmText}
                    onConfirm={handleAlertClose}
                />
            )}
        </ModalContext.Provider>
    )
}

export function useModal() {
    const context = useContext(ModalContext)
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider')
    }
    return context
}
