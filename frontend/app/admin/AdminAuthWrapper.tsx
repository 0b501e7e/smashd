'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  loyaltyPoints: number;
}

const AdminAuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (!token || !userString) {
      router.push('/login');
      return;
    }

    try {
      const user: User = JSON.parse(userString);
      if (user.role === 'ADMIN') {
        setIsAuthorized(true);
      } else {
        // Redirect non-admin users to the home page or an unauthorized page
        router.push('/');
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    // Optional: Show a loading indicator while checking auth
    return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-yellow-400">Loading...</p></div>;
  }

  if (!isAuthorized) {
    // Use Alert for Access Denied message
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
            <Alert variant="destructive" className="max-w-md">
                <AlertTitle className="font-bold">Access Denied</AlertTitle>
                <AlertDescription className="text-sm">
                    You do not have permission to view this page.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return <>{children}</>;
};

export default AdminAuthWrapper; 