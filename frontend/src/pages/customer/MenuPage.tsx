import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, tablesApi } from '../../services/api';
import { MenuList, CategoryTabs, ModifierSelectionDialog, BottomNavigation } from '../../components/customer';
import type { Category } from '../../components/customer';
import { useCartStore, type CartItemModifier } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { authService } from '../../services/auth.service';
import type { ModifierGroup } from '@aerodine/shared-types';
import { formatVND } from '../../utils/currency';

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
  const [searchParams] = useSearchParams();
  const { addItem, getItemCount, tableId, restaurantId: cartRestaurantId, setRestaurantId, setTableId } = useCartStore();
  const { user, isAuthenticated, clearUser } = useUserStore();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModifierDialogOpen, setIsModifierDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<number | null>(null);

  // Validate token from URL and bind cart to table session
  useEffect(() => {
    const validateTokenAndBindCart = async () => {
      const token = searchParams.get('token');
      
      // If no token in URL, skip validation
      if (!token) {
        return;
      }

      // Use a ref or state to track if token has been processed to avoid re-validation
      // For now, we'll always validate if token exists (allows changing tables by scanning new QR)
      try {
        console.log('Validating table token from URL...');
        const result = await tablesApi.validateTableToken(token);
        
        if (result.valid && result.tableId && result.restaurantId) {
          console.log('Token validated successfully:', result);
          
          // Bind cart to table session (this will update cart even if tableId already exists)
          setTableId(result.tableId);
          setRestaurantId(result.restaurantId);
          
          // Update current restaurant ID
          setCurrentRestaurantId(result.restaurantId);
          
          // Remove token from URL to clean it up (prevents re-validation on re-render)
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('token');
          const newSearch = newSearchParams.toString();
          const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      } catch (error: any) {
        console.error('Failed to validate table token:', error);
        // Don't show error to user, just log it
        // Token might be invalid or expired, user can still browse menu
      }
    };

    validateTokenAndBindCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('token')]); // Only re-run when token changes

  // Initialize restaurantId from cartStore or fetch from tables
  useEffect(() => {
    const initializeRestaurantId = async () => {
      // If restaurantId is already set from token validation, use it
      if (cartRestaurantId) {
        setCurrentRestaurantId(cartRestaurantId);
        return;
      }

      try {
        // Try to get restaurantId from tables (similar to admin page)
        const tables = await tablesApi.getTables();
        if (tables && Array.isArray(tables) && tables.length > 0 && tables[0].restaurantId) {
          const firstRestaurantId = tables[0].restaurantId;
          setCurrentRestaurantId(firstRestaurantId);
          setRestaurantId(firstRestaurantId);
        } else {
          // Fallback: try common restaurantIds (1, 2, 4)
          console.warn('No tables found, trying fallback restaurantIds');
          setCurrentRestaurantId(1);
        }
      } catch (error) {
        console.error('Failed to fetch restaurantId from tables:', error);
        // Fallback to restaurantId 1 (first restaurant from seed)
        setCurrentRestaurantId(1);
      }
    };

    initializeRestaurantId();
  }, [cartRestaurantId, setRestaurantId]);

  useEffect(() => {
    if (currentRestaurantId) {
      loadCategories();
      loadMenuItems();
    }
  }, [currentRestaurantId]);

  useEffect(() => {
    if (!currentRestaurantId) return;
    const timeoutId = setTimeout(() => {
      loadMenuItems();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedCategoryId, searchQuery, currentRestaurantId]);

  const loadCategories = async () => {
    if (!currentRestaurantId) return;
    try {
      console.log('Loading categories with restaurantId:', currentRestaurantId);
      const response = await apiClient.get('/categories', {
        params: { restaurantId: currentRestaurantId }
      });
      console.log('Categories response:', response.data);
      setCategories(response.data.map((cat: any) => ({ id: cat.id, name: cat.name, image: cat.image })));
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  };

  const loadMenuItems = async () => {
    if (!currentRestaurantId) return;
    setLoading(true);
    try {
      const params: any = {
        restaurantId: currentRestaurantId
      };
      if (searchQuery) {
        params.q = searchQuery;
      }
      console.log('Loading menu items with params:', params);
      const response = await apiClient.get('/menu-items', { params });
      console.log('Menu items response:', response.data);
      console.log('Number of items received:', Array.isArray(response.data) ? response.data.length : 'Not an array');
      
      const items = Array.isArray(response.data) ? response.data : [];
      setMenuItems(items);
    } catch (error: any) {
      console.error('Failed to load menu items:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      setMenuItems([]);
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

  const handleLogout = async () => {
    await authService.logout();
    clearUser();
    setIsMenuOpen(false);
    navigate('/auth/login');
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

  const filteredItems = menuItems.filter((item) => {
    // Filter by category if selected
    if (selectedCategoryId && item.categoryId !== selectedCategoryId) {
      return false;
    }
    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    {isAuthenticated && user ? (
                      <>
                        <div className="px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-800">{user.fullName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </div>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate('/auth/login');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Login
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">Smart Restaurant</span>
              {tableId && (
                <span className="px-3 py-1 bg-[#eba157] text-white rounded-full text-sm font-medium">
                  Table {tableId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay to close menu when clicking outside */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div className="container mx-auto px-4 py-4">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eba157] focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <button
            onClick={() => setSelectedCategoryId(undefined)}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              selectedCategoryId === undefined
                ? 'bg-[#eba157] text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            [All]
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                selectedCategoryId === category.id
                  ? 'bg-[#eba157] text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              [{category.name}]
            </button>
          ))}
        </div>

        {/* Menu Items List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No menu items found</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const menuItem = convertToMenuFormat(item);
              return (
                <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex gap-4">
                    {item.images?.[0]?.url ? (
                      <img
                        src={item.images[0].url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                        <span className="text-lg font-bold text-[#eba157]">
                          {formatVND(Number(item.basePrice))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">(24 reviews)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.status === 'AVAILABLE' ? (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-gray-600">Available</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-sm text-gray-600">Sold Out</span>
                            </>
                          )}
                        </div>
                        {item.status === 'AVAILABLE' && (
                          <button
                            onClick={() => handleAddToCart(menuItem)}
                            className="px-4 py-1.5 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors text-sm font-medium"
                          >
                            [+ Add]
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

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
