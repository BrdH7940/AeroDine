import { useState } from 'react'
import { Clock, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { kdsTickets } from '../../data/mockData'
import type { KDSTicket } from '../../data/mockData'

interface TicketCardProps {
    ticket: KDSTicket
    onStatusChange: (id: string, newStatus: KDSTicket['status']) => void
}

function TicketCard({ ticket, onStatusChange }: TicketCardProps) {
    const isOverdue = ticket.elapsedMinutes > 20
    const isReady = ticket.status === 'ready'

    const getActionButton = () => {
        if (ticket.status === 'pending') {
            return (
                <button
                    onClick={() => onStatusChange(ticket.id, 'preparing')}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                >
                    Start
                </button>
            )
        } else if (ticket.status === 'preparing') {
            return (
                <button
                    onClick={() => onStatusChange(ticket.id, 'ready')}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                >
                    Mark ready
                </button>
            )
        } else {
            return (
                <button
                    onClick={() => {
                        // In real app, this would complete the order
                        alert(
                            `Order for Table ${ticket.tableNumber} completed!`
                        )
                    }}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircle size={18} />
                    Done
                </button>
            )
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        Table {ticket.tableNumber}
                    </h3>
                    <p className="text-sm text-slate-500">
                        Ordered at {ticket.orderTime}
                    </p>
                </div>
                <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                        isOverdue
                            ? 'bg-red-100 text-red-700'
                            : isReady
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                >
                    <Clock size={14} />
                    <span className="text-sm font-medium">
                        {ticket.elapsedMinutes} min
                    </span>
                </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
                {ticket.items.map((item, index) => (
                    <div key={index} className="text-base">
                        <div className="flex items-start justify-between">
                            <span className="font-medium text-slate-900">
                                <span className="bg-gray-700 text-yellow-400 px-1.5 py-0.5 rounded mr-1.5">
                                    {item.quantity}x
                                </span>
                                {item.name}
                            </span>
                        </div>
                        {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mt-1 ml-4 space-y-0.5">
                                {item.modifiers.map((modifier, modIndex) => (
                                    <p
                                        key={modIndex}
                                        className="text-sm text-slate-500"
                                    >
                                        - {modifier}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action Button */}
            {getActionButton()}
        </motion.div>
    )
}

export default function KDSPage() {
    const [tickets, setTickets] = useState<KDSTicket[]>(kdsTickets)

    const handleStatusChange = (id: string, newStatus: KDSTicket['status']) => {
        setTickets(
            tickets.map((ticket) =>
                ticket.id === id ? { ...ticket, status: newStatus } : ticket
            )
        )
    }

    const getTicketsByStatus = (status: KDSTicket['status']) => {
        return tickets.filter((ticket) => ticket.status === status)
    }

    const columns = [
        {
            title: 'Pending',
            status: 'pending' as const,
            borderColor: 'border-t-amber-500',
            count: getTicketsByStatus('pending').length,
        },
        {
            title: 'Preparing',
            status: 'preparing' as const,
            borderColor: 'border-t-blue-500',
            count: getTicketsByStatus('preparing').length,
        },
        {
            title: 'Ready',
            status: 'ready' as const,
            borderColor: 'border-t-emerald-500',
            count: getTicketsByStatus('ready').length,
        },
    ]

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-slate-900">
                    Kitchen display system
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Manage and track order preparation
                </p>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {columns.map((column) => (
                    <div key={column.status} className="flex flex-col">
                        {/* Column Header */}
                        <div
                            className={`bg-white rounded-t-lg border-t-4 ${column.borderColor} p-4 shadow-sm relative`}
                        >
                            <div className="flex items-center justify-center">
                                <h2 className="text-xl font-semibold text-slate-900">
                                    {column.title}
                                </h2>
                                <span className="absolute right-4 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                                    {column.count}
                                </span>
                            </div>
                        </div>

                        {/* Tickets */}
                        <div className="flex-1 bg-slate-50 rounded-b-lg min-h-[600px]">
                            {getTicketsByStatus(column.status).length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-slate-400 text-sm p-4">
                                    No orders
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {getTicketsByStatus(column.status).map(
                                        (ticket) => (
                                            <TicketCard
                                                key={ticket.id}
                                                ticket={ticket}
                                                onStatusChange={
                                                    handleStatusChange
                                                }
                                            />
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
