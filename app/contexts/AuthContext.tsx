import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI } from '@/services/api';

type User = {
  id: number;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Only check for authentication with JWT token
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const userData = await userAPI.getProfile();
          setUser(userData);
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
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
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
