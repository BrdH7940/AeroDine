import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { apiConfig } from '../config/api.config';
import { authService } from './auth.service';
import type { TableStatus } from '@aerodine/shared-types';

/**
 * Axios instance configured with base URL from environment
 */
export const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for adding auth tokens, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Remove Authorization header if no token to avoid sending stale/invalid tokens
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await authService.refreshAccessToken();
        
        if (newToken) {
          // Update token in original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          
          // Process queued requests with new token
          processQueue(null, newToken);
          
          // Retry original request
          return apiClient(originalRequest);
        } else {
          // Refresh failed - clear tokens and redirect to login
          processQueue(new Error('Token refresh failed'), null);
          authService.logout();
          
          // Redirect to login page if not already there
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
          
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        processQueue(refreshError, null);
        authService.logout();
        
        // Redirect to login page if not already there
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors (403, 404, etc.)
    if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error('Forbidden: Insufficient permissions');
    }

    return Promise.reject(error);
  }
);

// ============================================
// REPORTS API
// ============================================

export const reportsApi = {
  /**
   * Get dashboard statistics (revenue, orders, active tables)
   */
  getDashboardStats: async () => {
    const response = await apiClient.get('/reports/stats');
    return response.data;
  },

  /**
   * Get revenue chart data
   * @param range - 'week', '30', 'month', 'lastMonth', or '3months'
   */
  getRevenueChart: async (range: string = 'week') => {
    const response = await apiClient.get('/reports/revenue', {
      params: { range },
    });
    return response.data;
  },

  /**
   * Get top 5 selling items
   */
  getTopSellingItems: async () => {
    const response = await apiClient.get('/reports/top-items');
    return response.data;
  },

  /**
   * Get payment methods breakdown
   */
  getPaymentMethodsBreakdown: async () => {
    const response = await apiClient.get('/reports/payment-methods');
    return response.data;
  },

  /**
   * Get sales by category
   */
  getCategorySales: async () => {
    const response = await apiClient.get('/reports/category-sales');
    return response.data;
  },

  /**
   * Get voided items
   */
  getVoidedItems: async () => {
    const response = await apiClient.get('/reports/voided-items');
    return response.data;
  },

  /**
   * Get peak hours analysis
   */
  getPeakHours: async () => {
    const response = await apiClient.get('/reports/peak-hours');
    return response.data;
  },

  /**
   * Get revenue by day of week
   */
  getDayOfWeekRevenue: async () => {
    const response = await apiClient.get('/reports/day-of-week-revenue');
    return response.data;
  },

  /**
   * Get menu performance matrix
   */
  getMenuPerformance: async () => {
    const response = await apiClient.get('/reports/menu-performance');
    return response.data;
  },

  /**
   * Get top modifiers
   */
  getTopModifiers: async () => {
    const response = await apiClient.get('/reports/top-modifiers');
    return response.data;
  },

  /**
   * Get rating vs volume data
   */
  getRatingVolume: async () => {
    const response = await apiClient.get('/reports/rating-volume');
    return response.data;
  },

  /**
   * Get prep time trends
   */
  getPrepTimeTrends: async () => {
    const response = await apiClient.get('/reports/prep-time-trends');
    return response.data;
  },
};


// ============================================
// MENUS API
// ============================================

export interface CreateMenuItemDto {
  restaurantId: number;
  categoryId: number;
  name: string;
  description?: string;
  basePrice: number;
  image?: string;
  status?: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN';
  isChefRecommendation?: boolean;
  modifierGroupIds?: number[];
}

export interface UpdateMenuItemDto {
  categoryId?: number;
  name?: string;
  description?: string;
  basePrice?: number;
  image?: string;
  status?: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN';
  isChefRecommendation?: boolean;
  modifierGroupIds?: number[];
}

export const menusApi = {
  /**
   * Get all categories for a restaurant
   */
  getCategories: async (restaurantId: number) => {
    const response = await apiClient.get('/categories', {
      params: { restaurantId },
    });
    return response.data;
  },

  /**
   * Get all menu items with optional search and sort
   */
  getMenuItems: async (restaurantId: number, searchQuery?: string, sortBy?: string) => {
    const params: any = {
      restaurantId,
    };
    if (searchQuery) {
      params.q = searchQuery;
    }
    if (sortBy) {
      params.sortBy = sortBy;
    }
    const response = await apiClient.get('/menu-items', { params });
    return response.data;
  },

  /**
   * Create a new menu item
   */
  createMenuItem: async (data: CreateMenuItemDto) => {
    const response = await apiClient.post('/menu-items', data);
    return response.data;
  },

  /**
   * Update menu item
   */
  updateMenuItem: async (id: number, data: UpdateMenuItemDto) => {
    const response = await apiClient.patch(`/menu-items/${id}`, data);
    return response.data;
  },

  /**
   * Delete menu item
   */
  deleteMenuItem: async (id: number) => {
    const response = await apiClient.delete(`/menu-items/${id}`);
    return response.data;
  },

  /**
   * Get modifier groups for a restaurant
   */
  getModifierGroups: async (restaurantId: number) => {
    const response = await apiClient.get('/modifiers', {
      params: { restaurantId },
    });
    return response.data;
  },

  /**
   * Get reviews and rating for a menu item
   */
  getMenuItemReviews: async (menuItemId: number) => {
    const response = await apiClient.get(`/menu-items/${menuItemId}/reviews`);
    return response.data;
  },

  /**
   * Create a review for a menu item (authenticated users only)
   */
  createReview: async (menuItemId: number, data: { rating: number; comment?: string }) => {
    const response = await apiClient.post(`/menu-items/${menuItemId}/reviews`, data);
    return response.data;
  },
};

// ============================================
// TABLES API
// ============================================

export interface CreateTableDto {
  restaurantId: number;
  name: string;
  capacity: number;
  status?: TableStatus;
}

export interface UpdateTableDto {
  name?: string;
  capacity?: number;
  status?: TableStatus;
  isActive?: boolean;
}

export const tablesApi = {
  /**
   * Get all tables, optionally filtered by restaurant
   */
  getTables: async (restaurantId?: number) => {
    const response = await apiClient.get('/tables', {
      params: restaurantId ? { restaurantId } : undefined,
    });
    return response.data;
  },

  /**
   * Get table by ID
   */
  getTableById: async (id: number) => {
    const response = await apiClient.get(`/tables/${id}`);
    return response.data;
  },

  /**
   * Create a new table
   */
  createTable: async (data: CreateTableDto) => {
    const response = await apiClient.post('/tables', data);
    return response.data;
  },

  /**
   * Update table
   */
  updateTable: async (id: number, data: UpdateTableDto) => {
    const response = await apiClient.patch(`/tables/${id}`, data);
    return response.data;
  },

  /**
   * Delete table
   */
  deleteTable: async (id: number) => {
    const response = await apiClient.delete(`/tables/${id}`);
    return response.data;
  },

  /**
   * Validate table token from QR code
   * Returns tableId and restaurantId if token is valid
   */
  validateTableToken: async (token: string) => {
    const response = await apiClient.get('/tables/validate-token', {
      params: { token },
    });
    return response.data;
  },

  /**
   * Get QR code URL for table
   */
  getTableQrUrl: async (id: number) => {
    const response = await apiClient.get(`/tables/${id}/qr`);
    return response.data;
  },

  /**
   * Refresh table token
   */
  refreshTableToken: async (id: number) => {
    const response = await apiClient.patch(`/tables/${id}/refresh-token`);
    return response.data;
  },

  /**
   * Refresh tokens for all tables
   */
  refreshAllTableTokens: async (restaurantId?: number) => {
    const response = await apiClient.patch('/tables/refresh-tokens/all', null, {
      params: restaurantId ? { restaurantId } : undefined,
    });
    return response.data;
  },
};

// ============================================
// USERS API
// ============================================

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

export interface UpdateUserDto {
  email?: string;
  fullName?: string;
  avatar?: string;
  role?: string;
}

export const usersApi = {
  /**
   * Get all users
   */
  getUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: number) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user
   */
  createUser: async (data: CreateUserDto) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  /**
   * Update user
   */
  updateUser: async (id: number, data: UpdateUserDto) => {
    const response = await apiClient.patch(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Toggle user active status (activate/deactivate)
   */
  toggleUserActive: async (id: number) => {
    const response = await apiClient.patch(`/users/${id}/toggle-active`);
    return response.data;
  },

  /**
   * Delete user
   */
  deleteUser: async (id: number) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  /**
   * Upload user avatar
   */
  uploadAvatar: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/users/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export interface Restaurant {
  id: number;
  name: string;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRestaurantDto {
  name?: string;
  address?: string;
  isActive?: boolean;
}

export const restaurantsApi = {
  /**
   * Get all restaurants
   */
  getRestaurants: async (): Promise<Restaurant[]> => {
    const response = await apiClient.get('/restaurants');
    return response.data;
  },

  /**
   * Get restaurant by ID
   */
  getRestaurantById: async (id: number): Promise<Restaurant> => {
    const response = await apiClient.get(`/restaurants/${id}`);
    return response.data;
  },

  /**
   * Update restaurant
   */
  updateRestaurant: async (id: number, data: UpdateRestaurantDto): Promise<Restaurant> => {
    const response = await apiClient.patch(`/restaurants/${id}`, data);
    return response.data;
  },
};

// Export apiClient as named export only (no default export)
// Use: import { apiClient } from './api'
