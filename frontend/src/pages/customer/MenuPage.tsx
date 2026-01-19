import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, tablesApi } from '../../services/api';
import { ModifierSelectionDialog, MenuItemDetailDialog, BottomNavigation, AiOrderModal } from '../../components/customer';
import type { Category } from '../../components/customer';
import { useCartStore, type CartItemModifier } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { authService } from '../../services/auth.service';
import type { ModifierGroup } from '@aerodine/shared-types';
import { UserRole } from '@aerodine/shared-types';
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
  const { addItem, tableId, restaurantId: cartRestaurantId, setRestaurantId, setTableId } = useCartStore();
  const { user, isAuthenticated, clearUser } = useUserStore();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModifierDialogOpen, setIsModifierDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<number | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleModifierConfirm = (modifiers: CartItemModifier[], _totalPrice: number) => {
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

  const handleItemClick = (item: MenuItem) => {
    setSelectedDetailItem(item);
    setIsDetailDialogOpen(true);
  };

  const handleDetailDialogAddToCart = (modifiers: CartItemModifier[], _totalPrice: number, note?: string) => {
    if (!selectedDetailItem) return;

    addItem({
      menuItemId: selectedDetailItem.id,
      name: selectedDetailItem.name,
      basePrice: Number(selectedDetailItem.basePrice),
      quantity: 1,
      image: selectedDetailItem.images?.[0]?.url,
      modifiers,
      note,
    });

    setSelectedDetailItem(null);
    setIsDetailDialogOpen(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    clearUser();
    setIsMenuOpen(false);
    navigate('/auth/login');
  };

  // Handle AI suggestion items - add all to cart
  const handleAiAddToCart = (items: { id: number; name: string; price: number; quantity: number }[]) => {
    items.forEach((item) => {
      // Find the menu item to get image
      const menuItem = menuItems.find((m) => m.id === item.id);
      addItem({
        menuItemId: item.id,
        name: item.name,
        basePrice: item.price,
        quantity: item.quantity,
        image: menuItem?.images?.[0]?.url,
      });
    });
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

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
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
  }, [menuItems, selectedCategoryId, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryId, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F9F7F2] pb-20">
      {/* Header */}
      <div className="bg-[#8A9A5B] p-5 sticky top-0 z-50 border-b border-[#8A9A5B]/20 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:bg-[#6B7A4A] p-2 rounded-xl transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#8A9A5B]/20 z-[60] backdrop-blur-xl">
                <div className="py-1">
                  {isAuthenticated && user ? (
                    <>
                      <div className="px-4 py-2 border-b border-[#8A9A5B]/20">
                        <p className="text-sm font-medium text-[#36454F]">{user.fullName}</p>
                        <p className="text-xs text-[#36454F]/70">{user.email}</p>
                      </div>
                      {/* Admin Navigation Buttons */}
                      {(typeof user.role === 'string' ? user.role.toUpperCase() : user.role) === UserRole.ADMIN && (
                        <>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate('/admin/dashboard');
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-[#36454F] hover:bg-[#F9F7F2] transition-colors border-b border-[#8A9A5B]/10"
                          >
                            <div className="flex items-center gap-2 hover:text-[#8A9A5B]">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              <span className="hover:text-[#8A9A5B]">Admin Dashboard</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate('/staff/waiter/orders');
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-[#36454F] hover:bg-[#F9F7F2] transition-colors border-b border-[#8A9A5B]/10"
                          >
                            <div className="flex items-center gap-2 hover:text-[#8A9A5B]">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                              </svg>
                              <span className="hover:text-[#8A9A5B]">Waiter Dashboard</span>
                            </div>
                          </button>
                        </>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-[#36454F] hover:bg-[#F9F7F2] transition-colors"
                      >
                        <div className="flex items-center gap-2 hover:text-[#8A9A5B]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="hover:text-[#8A9A5B]">Logout</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/auth/login');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#36454F] hover:bg-[#F9F7F2] transition-colors"
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="text-white text-sm font-semibold">Smart Restaurant</span>
            </div>
            {tableId && (
              <span className="bg-[#D4AF37] text-white px-4 py-1.5 rounded-full text-sm font-bold">
                Table {tableId}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#36454F]/50 group-focus-within:text-[#8A9A5B] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            className="w-full bg-white text-[#36454F] pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/30 transition-all duration-200 border border-[#8A9A5B]/20 focus:border-[#8A9A5B] placeholder:text-[#36454F]/50 shadow-sm"
          />
        </div>

        {/* Categories */}
        <div className="bg-white px-4 py-4 border-b border-[#8A9A5B]/20 overflow-x-auto mt-4 -mx-5 -mb-5">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategoryId(undefined)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                selectedCategoryId === undefined
                  ? 'bg-[#8A9A5B] text-white'
                  : 'bg-white text-[#36454F] hover:bg-[#F9F7F2] border border-[#8A9A5B]/30'
              }`}
            >
              [All]
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  selectedCategoryId === category.id
                    ? 'bg-[#8A9A5B] text-white'
                    : 'bg-white text-[#36454F] hover:bg-[#F9F7F2] border border-[#8A9A5B]/30'
                }`}
              >
                [{category.name}]
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay to close menu when clicking outside */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* AI Order Button */}
      {currentRestaurantId && (
        <div className="px-5 py-3 bg-white border-b border-[#8A9A5B]/20">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="w-full py-3 bg-[#D4AF37] hover:bg-[#b8962e] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            ✨ Order with AI - Gợi ý combo thông minh
          </button>
        </div>
      )}

      {/* Menu Items */}
      <div className="p-5 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-white rounded-xl p-4 animate-pulse border border-[#8A9A5B]/20 shadow-sm">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-[#F9F7F2] rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-[#F9F7F2] rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-[#F9F7F2] rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-[#F9F7F2] rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#36454F] text-lg font-medium">No items found</p>
              <p className="text-[#36454F]/70 text-sm mt-2">Try a different search</p>
            </div>
          ) : (
            paginatedItems.map((item) => {
              const menuItem = convertToMenuFormat(item);
              return (
                <div 
                  key={item.id} 
                  className="bg-white rounded-xl p-4 border border-[#8A9A5B]/20 cursor-pointer hover:border-[#8A9A5B] hover:shadow-md transition-all duration-200 shadow-sm"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex gap-4">
                    {item.images?.[0]?.url ? (
                      <img
                        src={item.images[0].url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-[#F9F7F2] rounded-xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#8A9A5B]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-lg font-semibold text-[#36454F]">{item.name}</h3>
                        <span className="text-lg font-bold text-[#8A9A5B]">
                          {formatVND(Number(item.basePrice))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex text-[#D4AF37]">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm text-[#36454F]/70">(24 reviews)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.status === 'AVAILABLE' ? (
                            <>
                              <div className="w-2 h-2 bg-[#8A9A5B] rounded-full"></div>
                              <span className="text-sm text-[#36454F]">Available</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-sm text-[#36454F]">Sold Out</span>
                            </>
                          )}
                        </div>
                        {item.status === 'AVAILABLE' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(menuItem);
                            }}
                            className="px-4 py-1.5 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 text-sm font-medium"
                          >
                            + Add
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

      {/* Pagination */}
      {filteredItems.length > 0 && totalPages > 1 && (
        <div className="px-5 pb-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-[#36454F]/70">
            Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredItems.length)} trong tổng số {filteredItems.length} món
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-white border border-[#8A9A5B]/30 rounded-xl hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              aria-label="Previous page"
            >
              <svg className="w-5 h-5 text-[#36454F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-xl text-sm font-medium transition-all duration-200 ${
                    currentPage === page
                      ? 'bg-[#8A9A5B] text-white'
                      : 'bg-white border border-[#8A9A5B]/30 text-[#36454F] hover:bg-[#F9F7F2] shadow-sm'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-white border border-[#8A9A5B]/30 rounded-xl hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              aria-label="Next page"
            >
              <svg className="w-5 h-5 text-[#36454F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
          itemName={selectedItem?.name || ''}
          basePrice={Number(selectedItem?.basePrice || 0)}
          modifierGroups={
            selectedItem?.modifierGroups?.map((mg) => mg.modifierGroup).filter((mg) => mg && mg.options && mg.options.length > 0) || []
          }
          onConfirm={handleModifierConfirm}
        />
      )}

      {/* AI Order Modal */}
      {currentRestaurantId && (
        <AiOrderModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          restaurantId={currentRestaurantId}
          onAddToCart={handleAiAddToCart}
        />
      )}

      {/* Menu Item Detail Dialog */}
      {selectedDetailItem && (
        <MenuItemDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => {
            setIsDetailDialogOpen(false);
            setSelectedDetailItem(null);
          }}
          menuItem={selectedDetailItem!}
          onAddToCart={handleDetailDialogAddToCart}
        />
      )}
    </div>
  );
};
