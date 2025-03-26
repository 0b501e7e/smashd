'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/card"

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  loyaltyPoints: number;
}

interface Order {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{
    quantity: number;
    menuItem: {
      name: string;
      price: number;
    }
  }>;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch user profile');
        const userData: User = await response.json();
        setUser(userData);

        // Fetch orders
        const ordersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/users/${userData.id}/orders`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
        const ordersData: Order[] = await ordersResponse.json();
        setOrders(ordersData);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-yellow-400">Loading...</p>
    </div>;
  }

  if (error) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-yellow-400">No user data available</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-yellow-950 border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-yellow-400">User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-yellow-400">User Details</h2>
            <p className="text-white">Name: {user.username}</p>
            <p className="text-white">Email: {user.email}</p>
          </div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-yellow-400">Loyalty Points</h2>
            <p className="text-white">{user.loyaltyPoints} points</p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-yellow-400">Previous Orders</h2>
            {orders.length > 0 ? (
              <ul className="text-white">
                {orders.map((order) => (
                  <li key={order.id}>
                    Order #{order.id} - {new Date(order.createdAt).toLocaleDateString()} - €
                    {order.total.toFixed(2)} - Status: {order.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white">No previous orders</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
