import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI, setUnauthorizedCallback } from '@/services/api';
import { notificationService } from '@/services/notificationService';

type User = {
  id: number;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'DRIVER' | 'CUSTOMER';
  loyaltyPoints?: number;
};

type AuthContextType = {
  isLoggedIn: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    dateOfBirth: string,
    address: string,
    phoneNumber: string,
    acceptedTerms: boolean
  ) => Promise<void>;
  loading: boolean;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register the unauthorized callback
    setUnauthorizedCallback(() => {
      console.log('🔄 AuthContext: Received unauthorized signal, logging out...');
      // Force logout without calling API (since token is already invalid)
      AsyncStorage.removeItem('token').then(() => {
        setUser(null);
      });
    });

    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize notification service first
      await notificationService.initialize();

      // Then check authentication
      await checkAuth();
    } catch (error) {
      console.error('App initialization failed:', error);
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      // Only check for authentication with JWT token
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const userData = await userAPI.getProfile();
          setUser(userData);

          // Register push token for existing user
          if (userData?.id) {
            try {
              await notificationService.registerWithBackend(userData.id);
            } catch (notificationError) {
              console.warn('Failed to register push token for existing user:', notificationError);
            }
          }
        } catch (profileError: any) {
          // If profile fetch fails, token is likely invalid
          console.log('Token invalid, removing:', profileError.response?.status);
          await AsyncStorage.removeItem('token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      // Extract user from nested response structure
      const userData = response?.data?.user || response.user;
      setUser(userData);

      // Register push token with backend after successful login
      if (userData?.id) {
        try {
          await notificationService.registerWithBackend(userData.id);
        } catch (notificationError) {
          console.warn('Failed to register push token:', notificationError);
          // Don't fail login if notification registration fails
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Remove push token from backend before logout
      if (user?.id) {
        try {
          await notificationService.unregisterFromBackend(user.id);
        } catch (notificationError) {
          console.warn('Failed to unregister push token:', notificationError);
          // Continue with logout even if token removal fails
        }
      }

      await AsyncStorage.removeItem('token');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      await AsyncStorage.removeItem('token');
      setUser(null);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    dateOfBirth: string,
    address: string,
    phoneNumber: string,
    acceptedTerms: boolean
  ) => {
    try {
      await authAPI.register(email, password, name, dateOfBirth, address, phoneNumber, acceptedTerms);
      // Login will automatically handle push token registration
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!user,
        user,
        login,
        logout,
        register,
        loading,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
