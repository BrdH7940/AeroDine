import apiClient from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
    createdAt?: string;
  };
  accessToken: string;
  refreshToken?: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/auth/login', credentials);
    // Backend returns access_token (snake_case), normalize to accessToken
    const token = response.data.access_token || response.data.accessToken;
    const refreshToken = response.data.refresh_token || response.data.refreshToken;
    const user = response.data.user;
    
    // Lưu tokens vào localStorage
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }
    
    // Return normalized response
    return {
      accessToken: token,
      refreshToken,
      user,
    };
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/auth/register', userData);
    // Backend returns access_token (snake_case), normalize to accessToken
    const token = response.data.access_token || response.data.accessToken;
    const refreshToken = response.data.refresh_token || response.data.refreshToken;
    const user = response.data.user;
    
    // Lưu tokens vào localStorage
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }
    
    // Return normalized response
    return {
      accessToken: token,
      refreshToken,
      user,
    };
  },

  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate refresh token on server
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with local logout even if server call fails
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await apiClient.post<any>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      const newAccessToken = response.data.access_token || response.data.accessToken;
      
      if (newAccessToken) {
        localStorage.setItem('token', newAccessToken);
        // Update user data if provided
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return newAccessToken;
      }
      return null;
    } catch (error) {
      // Refresh failed - clear tokens and user data
      this.logout();
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
