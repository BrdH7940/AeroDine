import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { MenuList, CategoryTabs } from '../../components/customer';
import type { Category } from '../../components/customer';
import { useCartStore } from '../../store/cartStore';

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
}

export const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { addItem, getItemCount } = useCartStore();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

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
    const menuItem = item as MenuItem;
    addItem({
      menuItemId: menuItem.id,
      name: menuItem.name,
      basePrice: Number(menuItem.basePrice),
      quantity: 1,
      image: menuItem.images?.[0]?.url,
    });
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
          className="relative px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
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
          onAddToCart={(item) => {
            const menuItem = menuItems.find((mi) => mi.id.toString() === item.id);
            if (menuItem) {
              handleAddToCart(menuItem);
            }
          }}
          loading={loading}
        />
      </div>
    </div>
  );
};
