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
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/auth/login', credentials);
    // Backend returns access_token (snake_case), normalize to accessToken
    const token = response.data.access_token || response.data.accessToken;
    const user = response.data.user;
    
    // Lưu token vào localStorage
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Return normalized response
    return {
      accessToken: token,
      user,
    };
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/auth/register', userData);
    // Backend returns access_token (snake_case), normalize to accessToken
    const token = response.data.access_token || response.data.accessToken;
    const user = response.data.user;
    
    // Lưu token vào localStorage
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Return normalized response
    return {
      accessToken: token,
      user,
    };
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
