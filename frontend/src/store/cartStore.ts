import { useEffect, useReducer } from 'react';

export interface CartItem {
  menuItemId: number;
  name: string;
  basePrice: number;
  quantity: number;
  image?: string;
  modifiers?: CartItemModifier[];
  note?: string;
}

export interface CartItemModifier {
  modifierGroupId: number;
  modifierGroupName: string;
  modifierOptionId?: number;
  modifierName: string;
  priceAdjustment: number;
}

// Helper function to compare modifiers
const areModifiersEqual = (mods1?: CartItemModifier[], mods2?: CartItemModifier[]): boolean => {
  if (!mods1 && !mods2) return true;
  if (!mods1 || !mods2) return false;
  if (mods1.length !== mods2.length) return false;

  const sorted1 = [...mods1].sort((a, b) => a.modifierGroupId - b.modifierGroupId);
  const sorted2 = [...mods2].sort((a, b) => a.modifierGroupId - b.modifierGroupId);

  return sorted1.every((mod1, index) => {
    const mod2 = sorted2[index];
    return (
      mod1.modifierGroupId === mod2.modifierGroupId &&
      mod1.modifierOptionId === mod2.modifierOptionId &&
      mod1.modifierName === mod2.modifierName
    );
  });
};

// Create a simple store without Zustand for now (to avoid dependencies)
// Using a module-level state with React hooks pattern
let cartState: {
  items: CartItem[];
  tableId?: number;
  restaurantId?: number;
} = {
  items: [],
  tableId: undefined,
  restaurantId: undefined,
};

const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// Load from localStorage on init
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem('aerodine-cart');
    if (stored) {
      const parsed = JSON.parse(stored);
      cartState = {
        items: parsed.items || [],
        tableId: parsed.tableId,
        restaurantId: parsed.restaurantId,
      };
    }
  } catch (error) {
    console.error('Failed to load cart from storage:', error);
  }
};

const saveToStorage = () => {
  try {
    localStorage.setItem('aerodine-cart', JSON.stringify(cartState));
  } catch (error) {
    console.error('Failed to save cart to storage:', error);
  }
};

// Initialize
loadFromStorage();

export const cartStore = {
  getState: () => ({ ...cartState }),

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const existingIndex = cartState.items.findIndex(
      (existing) =>
        existing.menuItemId === item.menuItemId && 
        areModifiersEqual(existing.modifiers, item.modifiers) &&
        existing.note === item.note
    );

    if (existingIndex >= 0) {
      cartState.items[existingIndex].quantity += item.quantity || 1;
    } else {
      cartState.items.push({
        ...item,
        quantity: item.quantity || 1,
        modifiers: item.modifiers || [],
        note: item.note,
      });
    }

    saveToStorage();
    notifyListeners();
  },

  removeItem: (menuItemId: number, modifiers?: CartItemModifier[]) => {
    const index = cartState.items.findIndex(
      (item) => item.menuItemId === menuItemId && areModifiersEqual(item.modifiers, modifiers)
    );

    if (index >= 0) {
      cartState.items.splice(index, 1);
      saveToStorage();
      notifyListeners();
    }
  },

  updateQuantity: (menuItemId: number, quantity: number, modifiers?: CartItemModifier[]) => {
    if (quantity <= 0) {
      cartStore.removeItem(menuItemId, modifiers);
      return;
    }

    const item = cartState.items.find(
      (item) => item.menuItemId === menuItemId && areModifiersEqual(item.modifiers, modifiers)
    );

    if (item) {
      item.quantity = quantity;
      saveToStorage();
      notifyListeners();
    }
  },

  clearCart: () => {
    cartState.items = [];
    cartState.tableId = undefined;
    saveToStorage();
    notifyListeners();
  },

  setTableId: (tableId: number) => {
    cartState.tableId = tableId;
    saveToStorage();
    notifyListeners();
  },

  setRestaurantId: (restaurantId: number) => {
    cartState.restaurantId = restaurantId;
    saveToStorage();
    notifyListeners();
  },

  getTotal: () => {
    return cartState.items.reduce((total, item) => {
      const itemPrice = item.basePrice + (item.modifiers?.reduce((sum, mod) => sum + mod.priceAdjustment, 0) || 0);
      return total + itemPrice * item.quantity;
    }, 0);
  },

  getItemCount: () => {
    return cartState.items.reduce((count, item) => count + item.quantity, 0);
  },

  getItem: (menuItemId: number, modifiers?: CartItemModifier[]): CartItem | undefined => {
    return cartState.items.find(
      (item) => item.menuItemId === menuItemId && areModifiersEqual(item.modifiers, modifiers)
    );
  },
};

// React hook for using the cart store
export const useCartStore = () => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const unsubscribe = cartStore.subscribe(() => {
      forceUpdate();
    });
    return unsubscribe;
  }, []);

  return {
    ...cartStore.getState(),
    addItem: cartStore.addItem,
    removeItem: cartStore.removeItem,
    updateQuantity: cartStore.updateQuantity,
    clearCart: cartStore.clearCart,
    setTableId: cartStore.setTableId,
    setRestaurantId: cartStore.setRestaurantId,
    getTotal: cartStore.getTotal,
    getItemCount: cartStore.getItemCount,
    getItem: cartStore.getItem,
  };
};
