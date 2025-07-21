'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface User {
  id: number;
  email: string;
  role: string;
}

const AdminAuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    console.log('Token exists:', !!token);
    console.log('User string from localStorage:', userString);

    if (!token || !userString || userString === 'undefined') {
      console.log('Missing credentials, redirecting to login...');
      // Clear any bad data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }

    try {
      const user: User = JSON.parse(userString);
      console.log('Parsed user data:', user);
      console.log('User role:', user.role);
      
      if (user.role === 'ADMIN') {
        console.log('✅ User is authorized as admin');
        setIsAuthorized(true);
      } else {
        console.log('❌ User is not admin, role:', user.role);
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      console.error('Raw user string:', userString);
      // Clear corrupted data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertTitle className="text-red-800">Access Denied</AlertTitle>
          <AlertDescription className="text-red-700">
            You do not have administrative privileges to access this area.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminAuthWrapper; 