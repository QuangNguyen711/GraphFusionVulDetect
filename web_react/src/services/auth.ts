import { apiFetch } from './api';

// Types matching backend schemas
export interface UserRegister {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  user_id?: string;
  username?: string;
  email?: string;
  full_name?: string;
  bio?: string;
  created_at?: string;
  last_login?: string;
}

export interface AuthResponse {
  token: Token;
  user: UserProfile;
}

// Auth Service Class
export class AuthService {
  private static readonly AUTH_ENDPOINTS = {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    ME: '/api/v1/auth/me',
    PROFILE: '/api/v1/auth/profile',
  };

  /**
   * Register a new user
   */
  static async register(userData: UserRegister): Promise<UserProfile> {
    try {
      const user = await apiFetch<UserProfile>(this.AUTH_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: userData,
      });
      
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user and get access token
   */
  static async login(credentials: UserLogin): Promise<Token> {
    try {
      const tokenData = await apiFetch<Token>(this.AUTH_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: credentials,
      });

      // Store token in localStorage
      localStorage.setItem('auth_token', tokenData.access_token);
      
      return tokenData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<UserProfile> {
    try {
      const user = await apiFetch<UserProfile>(this.AUTH_ENDPOINTS.ME, {
        method: 'GET',
        requireAuth: true,
      });
      
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await apiFetch(this.AUTH_ENDPOINTS.LOGOUT, {
        method: 'POST',
        requireAuth: true,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error for logout - always clear local storage
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const updatedUser = await apiFetch<UserProfile>(this.AUTH_ENDPOINTS.PROFILE, {
        method: 'PUT',
        body: profileData,
        requireAuth: true,
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  /**
   * Get stored token
   */
  static getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Clear authentication data
   */
  static clearAuth(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  /**
   * Store user data in localStorage
   */
  static storeUser(user: UserProfile): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  /**
   * Get stored user data
   */
  static getStoredUser(): UserProfile | null {
    try {
      const userData = localStorage.getItem('auth_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }
}

export default AuthService;
