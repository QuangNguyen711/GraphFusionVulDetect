import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService, { UserProfile } from '@/services/auth';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  username?: string;
  full_name?: string;
  bio?: string;
  created_at?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, username?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Helper function to convert UserProfile to User
const mapUserProfileToUser = (profile: UserProfile): User => {
  return {
    id: profile.user_id || '',
    email: profile.email || '',
    name: profile.full_name || profile.username || '',
    username: profile.username,
    full_name: profile.full_name,
    bio: profile.bio,
    created_at: profile.created_at,
    last_login: profile.last_login,
    avatar: profile.email ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}` : undefined,
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status and load user data
  const checkAuthStatus = async () => {
    const token = AuthService.getToken();
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to get current user from API
      const userProfile = await AuthService.getCurrentUser();
      const userData = mapUserProfileToUser(userProfile);
      setUser(userData);
      AuthService.storeUser(userProfile);
    } catch (error) {
      console.error('Auth check failed:', error);
      // If API call fails, try to load from localStorage
      const storedUser = AuthService.getStoredUser();
      if (storedUser) {
        const userData = mapUserProfileToUser(storedUser);
        setUser(userData);
      } else {
        // Clear invalid auth data
        AuthService.clearAuth();
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Login and get token
      await AuthService.login({
        username: usernameOrEmail,
        password: password,
      });

      // Get user profile after successful login
      const userProfile = await AuthService.getCurrentUser();
      const userData = mapUserProfileToUser(userProfile);
      
      setUser(userData);
      AuthService.storeUser(userProfile);
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      setIsLoading(false);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Đăng nhập thất bại';
      toast.error(errorMessage);
      return false;
    }
  };

  const register = async (
    name: string, 
    email: string, 
    password: string, 
    username?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Register user
      const userProfile = await AuthService.register({
        username: username || email.split('@')[0], // Use email prefix if no username provided
        email: email,
        password: password,
        full_name: name,
      });

      // After successful registration, automatically login
      const loginSuccess = await login(email, password);
      
      if (!loginSuccess) {
        // If auto-login fails, still consider registration successful
        setIsLoading(false);
        toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
        return true;
      }

      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
      setIsLoading(false);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Đăng ký thất bại';
      toast.error(errorMessage);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Force reload to clear any cached data
      window.location.href = '/login';
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const userProfile = await AuthService.getCurrentUser();
      const userData = mapUserProfileToUser(userProfile);
      setUser(userData);
      AuthService.storeUser(userProfile);
    } catch (error) {
      console.error('Refresh user error:', error);
      // If refresh fails, might need to re-authenticate
      await logout();
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>): Promise<boolean> => {
    try {
      const updatedProfile = await AuthService.updateProfile(profileData);
      const userData = mapUserProfileToUser(updatedProfile);
      setUser(userData);
      AuthService.storeUser(updatedProfile);
      toast.success('Cập nhật thông tin thành công!');
      return true;
    } catch (error: any) {
      console.error('Update profile error:', error);
      const errorMessage = error.message || 'Cập nhật thông tin thất bại';
      toast.error(errorMessage);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
