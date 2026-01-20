import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Plus, Minus, Trash2, RefreshCw, ShoppingCart, Users, Wallet, Utensils, Baby, Flame } from 'lucide-react';
import { apiClient } from '../../services/api';
import { formatVND } from '../../utils/currency';

interface SuggestedItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    category?: string;
}

interface AiSuggestionResponse {
    suggestedItems: SuggestedItem[];
    totalPrice: number;
    reason: string;
}

interface AiOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurantId: number;
    onAddToCart: (items: SuggestedItem[]) => void;
}

const cuisineStyles = [
    { value: 'vietnamese', label: 'Vietnamese' },
    { value: 'asian', label: 'Asian' },
    { value: 'western', label: 'Western' },
    { value: 'mixed', label: 'Mixed' },
];

const spicyLevels = [
    { value: 'none', label: 'None', icon: '🌱' },
    { value: 'mild', label: 'Mild', icon: '🌶️' },
    { value: 'medium', label: 'Medium', icon: '🌶️🌶️' },
    { value: 'hot', label: 'Hot', icon: '🌶️🌶️🌶️' },
];

export const AiOrderModal: React.FC<AiOrderModalProps> = ({
    isOpen,
    onClose,
    restaurantId,
    onAddToCart,
}) => {
    // Form state
    const [numberOfPeople, setNumberOfPeople] = useState(2);
    const [cuisineStyle, setCuisineStyle] = useState('mixed');
    const [hasChildren, setHasChildren] = useState(false);
    const [budget, setBudget] = useState(500000);
    const [spicyLevel, setSpicyLevel] = useState('none');
    const [additionalNotes, setAdditionalNotes] = useState('');

    // Result state
    const [suggestion, setSuggestion] = useState<AiSuggestionResponse | null>(null);
    const [editedItems, setEditedItems] = useState<SuggestedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'form' | 'result'>('form');
    
    // AI usage limit: 1 initial + 1 regenerate = max 2 uses
    const MAX_AI_USES = 2;
    const [aiUsageCount, setAiUsageCount] = useState(0);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('form');
            setSuggestion(null);
            setEditedItems([]);
            setError(null);
            setAiUsageCount(0); // Reset usage count when modal opens
        }
    }, [isOpen]);

    // Calculate total from edited items
    const calculateTotal = () => {
        return editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    };

    // Get AI suggestion
    const handleGetSuggestion = async () => {
        // Check usage limit
        if (aiUsageCount >= MAX_AI_USES) {
            setError('You have used all AI uses. Please add items manually or close and reopen the modal.');
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            // Use longer timeout for AI requests
            const response = await apiClient.post('/ai/suggest', {
                restaurantId,
                numberOfPeople,
                cuisineStyle,
                hasChildren,
                budget,
                spicyLevel,
                additionalNotes: additionalNotes || undefined,
            }, {
                timeout: 60000, // 60 second timeout for AI
            });

            console.log('AI suggestion response:', response.data);

            if (response.data && response.data.suggestedItems) {
                setSuggestion(response.data);
                setEditedItems([...response.data.suggestedItems]);
                setStep('result');
                setAiUsageCount(prev => prev + 1); // Increment usage count on success
            } else {
                setError('AI did not return a valid suggestion. Please try again.');
            }
        } catch (err: any) {
            console.error('AI suggestion error:', err);
            if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                setError('Request timed out. Please try again.');
            } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
                setError('Cannot connect to server. Please check if the backend is running.');
            } else {
                setError(err.response?.data?.message || 'Cannot get suggestion from AI. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Update item quantity
    const updateQuantity = (id: number, delta: number) => {
        setEditedItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                    : item
            )
        );
    };

    // Remove item
    const removeItem = (id: number) => {
        setEditedItems((prev) => prev.filter((item) => item.id !== id));
    };

    // Regenerate suggestion
    const handleRegenerate = () => {
        handleGetSuggestion();
    };

    // Add to cart
    const handleAddToCart = () => {
        if (editedItems.length > 0) {
            onAddToCart(editedItems);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-6 h-6" />
                                <h2 className="text-xl font-bold">Order with AI</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-sm text-white/80 mt-1">
                            {step === 'form'
                                ? 'Fill in the information to let AI suggest a suitable combo'
                                : 'View and adjust the suggestion from AI'}
                            {' '}({MAX_AI_USES - aiUsageCount} remaining uses)
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
                        {step === 'form' ? (
                            <div className="space-y-5">
                                {/* Number of People */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Users className="w-4 h-4" />
                                        Number of people
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
                                            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-2xl font-bold w-12 text-center">{numberOfPeople}</span>
                                        <button
                                            onClick={() => setNumberOfPeople(numberOfPeople + 1)}
                                            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Cuisine Style */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Utensils className="w-4 h-4" />
                                        Cuisine style
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {cuisineStyles.map((style) => (
                                            <button
                                                key={style.value}
                                                onClick={() => setCuisineStyle(style.value)}
                                                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                                                    cuisineStyle === style.value
                                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                {style.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Has Children */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Baby className="w-4 h-4" />
                                        Has children?
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setHasChildren(false)}
                                            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                                !hasChildren
                                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        >
                                            No
                                        </button>
                                        <button
                                            onClick={() => setHasChildren(true)}
                                            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                                hasChildren
                                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        >
                                            Yes
                                        </button>
                                    </div>
                                </div>

                                {/* Spicy Level */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Flame className="w-4 h-4" />
                                        Spicy level
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {spicyLevels.map((level) => (
                                            <button
                                                key={level.value}
                                                onClick={() => setSpicyLevel(level.value)}
                                                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                                                    spicyLevel === level.value
                                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                <span>{level.icon}</span>
                                                <span>{level.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Budget */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Wallet className="w-4 h-4" />
                                        Budget (VND)
                                    </label>
                                    <input
                                        type="number"
                                        value={budget}
                                        onChange={(e) => setBudget(Number(e.target.value))}
                                        min={100000}
                                        step={50000}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        {[300000, 500000, 800000, 1000000].map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setBudget(amount)}
                                                className={`flex-1 py-1 text-xs rounded border transition-colors ${
                                                    budget === amount
                                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                {(amount / 1000).toFixed(0)}k
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Notes */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Additional notes (optional)
                                    </label>
                                    <textarea
                                        value={additionalNotes}
                                        onChange={(e) => setAdditionalNotes(e.target.value)}
                                        placeholder="Example: Allergic to seafood, like grilled dishes..."
                                        rows={2}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* AI Reason */}
                                {suggestion?.reason && (
                                    <div className="p-3 bg-purple-50 rounded-lg">
                                        <p className="text-sm text-purple-800">
                                            <Sparkles className="w-4 h-4 inline mr-1" />
                                            {suggestion.reason}
                                        </p>
                                    </div>
                                )}

                                {/* Suggested Items */}
                                <div className="space-y-3">
                                    {editedItems.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            None is satisfied. Try again with different requirements.
                                        </div>
                                    ) : (
                                        editedItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{item.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {item.category} • {formatVND(item.price)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-medium">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="w-8 h-8 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Total */}
                                {editedItems.length > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                                        <span className="font-medium text-gray-700">Total:</span>
                                        <span className="text-xl font-bold text-purple-600">
                                            {formatVND(calculateTotal())}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200">
                        {step === 'form' ? (
                            <button
                                onClick={handleGetSuggestion}
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating suggestion...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Suggest combo for me
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('form')}
                                    className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Change
                                </button>
                                <button
                                    onClick={handleRegenerate}
                                    disabled={loading || aiUsageCount >= MAX_AI_USES}
                                    className="py-3 px-4 border border-purple-300 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={aiUsageCount >= MAX_AI_USES ? 'Đã hết lượt regenerate' : 'Tạo gợi ý mới'}
                                >
                                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={handleAddToCart}
                                    disabled={editedItems.length === 0}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    Add to cart
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AiOrderModal;
