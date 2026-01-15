import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { MenuList, CategoryTabs, ModifierSelectionDialog } from '../../components/customer';
import type { Category } from '../../components/customer';
import { useCartStore, type CartItemModifier } from '../../store/cartStore';
import type { ModifierGroup } from '@aerodine/shared-types';

// Menu item type matching backend response
interface MenuItem {
  id: number;
  name: string;
  description?: string;
  basePrice: number;
  status: string;
  category?: {
    id: number;
    name: string;
  };
  images?: Array<{
    id: number;
    url: string;
  }>;
  categoryId?: number;
  modifierGroups?: Array<{
    modifierGroup: ModifierGroup;
  }>;
}

export const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { addItem, getItemCount } = useCartStore();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModifierDialogOpen, setIsModifierDialogOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    loadMenuItems();
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/menus/categories');
      setCategories(response.data.map((cat: any) => ({ id: cat.id, name: cat.name, image: cat.image })));
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadMenuItems = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategoryId) {
        params.categoryId = selectedCategoryId;
      }
      const response = await apiClient.get('/menus/items', { params });
      setMenuItems(response.data);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: any) => {
    const menuItem = menuItems.find((mi) => mi.id.toString() === item.id);
    if (!menuItem) return;

    // Check if item has modifier groups
    const modifierGroups = menuItem.modifierGroups?.map((mg) => mg.modifierGroup).filter((mg) => mg && mg.options && mg.options.length > 0) || [];

    if (modifierGroups.length > 0) {
      // Open modifier selection dialog
      setSelectedItem(menuItem);
      setIsModifierDialogOpen(true);
    } else {
      // Add directly to cart
      addItem({
        menuItemId: menuItem.id,
        name: menuItem.name,
        basePrice: Number(menuItem.basePrice),
        quantity: 1,
        image: menuItem.images?.[0]?.url,
      });
    }
  };

  const handleModifierConfirm = (modifiers: CartItemModifier[], totalPrice: number) => {
    if (!selectedItem) return;

    addItem({
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      basePrice: Number(selectedItem.basePrice),
      quantity: 1,
      image: selectedItem.images?.[0]?.url,
      modifiers,
    });

    setSelectedItem(null);
    setIsModifierDialogOpen(false);
  };

  const handleCategorySelect = (categoryId?: number) => {
    setSelectedCategoryId(categoryId);
  };

  // Convert MenuItem to Menu format for MenuCard
  const convertToMenuFormat = (item: MenuItem) => ({
    id: item.id.toString(),
    name: item.name,
    description: item.description,
    price: Number(item.basePrice),
    category: item.category?.name,
    image: item.images?.[0]?.url,
    available: item.status === 'AVAILABLE',
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Menu</h1>
        <button
          onClick={() => navigate('/customer/cart')}
          className="relative px-6 py-2 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors duration-200 font-medium"
        >
          Cart ({getItemCount()})
        </button>
      </div>

      <CategoryTabs
        categories={categories}
        activeCategoryId={selectedCategoryId}
        onCategorySelect={handleCategorySelect}
        loading={loading && categories.length === 0}
      />

      <div className="mt-8">
        <MenuList
          items={menuItems.map(convertToMenuFormat)}
          onAddToCart={handleAddToCart}
          loading={loading}
        />
      </div>

      {/* Modifier Selection Dialog */}
      {selectedItem && (
        <ModifierSelectionDialog
          isOpen={isModifierDialogOpen}
          onClose={() => {
            setIsModifierDialogOpen(false);
            setSelectedItem(null);
          }}
          itemName={selectedItem.name}
          basePrice={Number(selectedItem.basePrice)}
          modifierGroups={
            selectedItem.modifierGroups?.map((mg) => mg.modifierGroup).filter((mg) => mg && mg.options && mg.options.length > 0) || []
          }
          onConfirm={handleModifierConfirm}
        />
      )}
    </div>
  );
};
