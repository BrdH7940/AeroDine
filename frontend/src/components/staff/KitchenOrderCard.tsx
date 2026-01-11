import { useState, useEffect } from 'react'
import { KitchenOrderView, KitchenItemView } from '@aerodine/shared-types'

/**
 * Kitchen Order Card Component for KDS
 * Displays order with items, timer, and action buttons
 *
 * @author Dev 2 - Operations Team
 */

interface KitchenOrderCardProps {
    order: KitchenOrderView
    onStartPreparing: (itemId: number) => void
    onMarkReady: (itemId: number) => void
    onBump: () => void
    listView?: boolean
}

export default function KitchenOrderCard({
    order,
    onStartPreparing,
    onMarkReady,
    onBump,
    listView = false,
}: KitchenOrderCardProps) {
    const [elapsed, setElapsed] = useState(order.elapsedMinutes)

    // Update elapsed time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const created = new Date(order.createdAt).getTime()
            const now = Date.now()
            setElapsed(Math.floor((now - created) / 60000))
        }, 60000)

        return () => clearInterval(interval)
    }, [order.createdAt])

    const formatElapsed = (minutes: number) => {
        if (minutes < 1) return '< 1m'
        if (minutes < 60) return `${minutes}m`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}m`
    }

    const getTimerColor = (minutes: number) => {
        if (minutes > 30) return 'text-red-500 animate-pulse'
        if (minutes > 20) return 'text-orange-500'
        if (minutes > 10) return 'text-yellow-500'
        return 'text-green-500'
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'QUEUED':
                return 'bg-gray-600'
            case 'PREPARING':
                return 'bg-orange-600 animate-pulse'
            case 'READY':
                return 'bg-green-600'
            default:
                return 'bg-gray-600'
        }
    }

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'QUEUED':
                return 'bg-gray-700'
            case 'PREPARING':
                return 'bg-orange-900/30'
            case 'READY':
                return 'bg-green-900/30'
            default:
                return 'bg-gray-700'
        }
    }

    const queuedItems = order.items.filter((item) => item.status === 'QUEUED')
    const preparingItems = order.items.filter(
        (item) => item.status === 'PREPARING',
    )
    const readyItems = order.items.filter((item) => item.status === 'READY')

    const allReady =
        readyItems.length === order.items.length && order.items.length > 0
    const isOverdue = elapsed > 30

    if (listView) {
        // List view layout
        return (
            <div
                className={`bg-gray-800 rounded-lg overflow-hidden ${
                    isOverdue ? 'ring-2 ring-red-500' : ''
                }`}
            >
                <div className="flex items-stretch">
                    {/* Order Header */}
                    <div
                        className={`w-24 flex flex-col items-center justify-center p-4 ${
                            isOverdue ? 'bg-red-900' : 'bg-gray-700'
                        }`}
                    >
                        <div className="text-2xl font-bold">
                            {order.tableName}
                        </div>
                        <div
                            className={`text-xl font-mono ${getTimerColor(
                                elapsed,
                            )}`}
                        >
                            {formatElapsed(elapsed)}
                        </div>
                        <div className="text-xs text-gray-400">#{order.id}</div>
                    </div>

                    {/* Items */}
                    <div className="flex-1 p-4">
                        <div className="flex flex-wrap gap-2">
                            {order.items.map((item) => (
                                <ItemBadge
                                    key={item.id}
                                    item={item}
                                    onStartPreparing={onStartPreparing}
                                    onMarkReady={onMarkReady}
                                />
                            ))}
                        </div>
                        {order.note && (
                            <div className="mt-2 text-sm text-yellow-400">
                                📝 {order.note}
                            </div>
                        )}
                    </div>

                    {/* Bump Button */}
                    <div className="flex items-center p-4">
                        <button
                            onClick={onBump}
                            className={`px-6 py-3 rounded-lg font-bold text-lg ${
                                allReady
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                            }`}
                        >
                            BUMP
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Grid view layout (card)
    return (
        <div
            className={`bg-gray-800 rounded-lg overflow-hidden flex flex-col ${
                isOverdue ? 'ring-2 ring-red-500' : ''
            } ${allReady ? 'ring-2 ring-green-500' : ''}`}
        >
            {/* Header */}
            <div
                className={`px-4 py-3 flex items-center justify-between ${
                    isOverdue ? 'bg-red-900' : 'bg-gray-700'
                }`}
            >
                <div>
                    <h3 className="text-xl font-bold">{order.tableName}</h3>
                    <p className="text-xs text-gray-400">Order #{order.id}</p>
                </div>
                <div className="text-right">
                    <div
                        className={`text-2xl font-mono ${getTimerColor(elapsed)}`}
                    >
                        {formatElapsed(elapsed)}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-700 flex">
                <div
                    className="bg-gray-500 h-full"
                    style={{
                        width: `${
                            (queuedItems.length / order.items.length) * 100
                        }%`,
                    }}
                />
                <div
                    className="bg-orange-500 h-full"
                    style={{
                        width: `${
                            (preparingItems.length / order.items.length) * 100
                        }%`,
                    }}
                />
                <div
                    className="bg-green-500 h-full"
                    style={{
                        width: `${
                            (readyItems.length / order.items.length) * 100
                        }%`,
                    }}
                />
            </div>

            {/* Items */}
            <div className="flex-1 p-3 space-y-2 max-h-80 overflow-y-auto">
                {order.items.map((item) => (
                    <ItemRow
                        key={item.id}
                        item={item}
                        onStartPreparing={onStartPreparing}
                        onMarkReady={onMarkReady}
                    />
                ))}
            </div>

            {/* Note */}
            {order.note && (
                <div className="px-3 py-2 bg-yellow-900/30 text-sm text-yellow-400 border-t border-yellow-900/50">
                    📝 {order.note}
                </div>
            )}

            {/* Bump Button */}
            <div className="p-3 border-t border-gray-700">
                <button
                    onClick={onBump}
                    className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
                        allReady
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                    }`}
                >
                    {allReady ? '✓ BUMP ORDER' : 'BUMP'}
                </button>
            </div>
        </div>
    )
}

// Item Row Component for Grid View
function ItemRow({
    item,
    onStartPreparing,
    onMarkReady,
}: {
    item: KitchenItemView
    onStartPreparing: (itemId: number) => void
    onMarkReady: (itemId: number) => void
}) {
    const getStatusBg = (status: string) => {
        switch (status) {
            case 'QUEUED':
                return 'bg-gray-700'
            case 'PREPARING':
                return 'bg-orange-900/40'
            case 'READY':
                return 'bg-green-900/40'
            default:
                return 'bg-gray-700'
        }
    }

    return (
        <div className={`rounded-lg p-2 ${getStatusBg(item.status)}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center">
                        <span className="text-lg font-bold mr-2">
                            {item.quantity}x
                        </span>
                        <span className="font-medium">{item.name}</span>
                    </div>
                    {item.modifiers.length > 0 && (
                        <div className="text-xs text-gray-400 ml-8">
                            {item.modifiers.join(', ')}
                        </div>
                    )}
                    {item.note && (
                        <div className="text-xs text-yellow-400 ml-8 mt-1">
                            📝 {item.note}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div>
                    {item.status === 'QUEUED' && (
                        <button
                            onClick={() => onStartPreparing(item.id)}
                            className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                        >
                            Start
                        </button>
                    )}
                    {item.status === 'PREPARING' && (
                        <button
                            onClick={() => onMarkReady(item.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                            Ready
                        </button>
                    )}
                    {item.status === 'READY' && (
                        <span className="px-3 py-1 bg-green-600/50 text-green-300 text-sm rounded">
                            ✓ Done
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

// Item Badge Component for List View
function ItemBadge({
    item,
    onStartPreparing,
    onMarkReady,
}: {
    item: KitchenItemView
    onStartPreparing: (itemId: number) => void
    onMarkReady: (itemId: number) => void
}) {
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'QUEUED':
                return 'bg-gray-600 hover:bg-gray-500'
            case 'PREPARING':
                return 'bg-orange-600 hover:bg-orange-500 animate-pulse'
            case 'READY':
                return 'bg-green-600 hover:bg-green-500'
            default:
                return 'bg-gray-600'
        }
    }

    const handleClick = () => {
        if (item.status === 'QUEUED') {
            onStartPreparing(item.id)
        } else if (item.status === 'PREPARING') {
            onMarkReady(item.id)
        }
    }

    return (
        <button
            onClick={handleClick}
            className={`px-3 py-2 rounded-lg ${getStatusStyle(
                item.status,
            )} transition-colors`}
            disabled={item.status === 'READY'}
        >
            <span className="font-bold">{item.quantity}x</span>{' '}
            <span>{item.name}</span>
            {item.modifiers.length > 0 && (
                <span className="text-xs opacity-75 ml-1">
                    ({item.modifiers.join(', ')})
                </span>
            )}
        </button>
    )
}
