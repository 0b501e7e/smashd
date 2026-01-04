'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../lib/apiConstants'; // Import API_BASE_URL

const PREP_TIMES = [15, 30, 45, 60]; // Available prep times in minutes

// Interface based on backend/server.js GET /v1/admin/orders
interface MenuItem {
  id: number;
  name: string;
  // Add other menuItem fields if available and needed
}

interface OrderItem {
  id: number;
  menuItemId: number;
  quantity: number;
  price: number;
  customizations?: string | null; // Assuming customizations are stringified JSON
  menuItem: MenuItem;
}

interface UserInfo {
  id: number;
  name?: string | null;
  email?: string | null;
}

interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  status: string; // e.g., PENDING, PAID, CONFIRMED, CANCELLED, READY
  userId?: number | null;
  user?: UserInfo | null; // User details
  createdAt: string; // ISO date string
  estimatedReadyTime?: string | null; // ISO date string, from backend
  fulfillmentMethod?: 'PICKUP' | 'DELIVERY' | null;
  deliveryAddress?: string | null;
  orderCode?: string | null;
  // Frontend-specific state for managing prep time selection
  selectedPrepTime?: number | null;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const knownOrderIds = useRef(new Set<number>());

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio('/sounds/order-alert.mp3'); // Ensure this path is correct
      audioRef.current.load();
    }
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.error("Error playing sound:", err));
    }
  };

  const fetchOrders = React.useCallback(async () => {
    setIsLoading(true);
    // setError(null); // Keep previous error for a moment if it's a refresh
    try {
      const token = localStorage.getItem('token'); // Corrected key from adminToken to token
      if (!token) {
        setError('Admin token not found. Please log in again.');
        setIsLoading(false);
        // Optionally, redirect to login or show a more prominent login message
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
      }
      const fetchedOrders: Order[] = await response.json();

      let newOrdersDetected = false;
      fetchedOrders.forEach(order => {
        if ((order.status === 'PAYMENT_CONFIRMED') && !knownOrderIds.current.has(order.id)) {
          newOrdersDetected = true;
        }
        knownOrderIds.current.add(order.id);
      });

      if (newOrdersDetected && orders.length > 0) { // Play sound only if there were existing orders and new ones arrived
        playNotificationSound();
      }

      setOrders(fetchedOrders.map(o => ({ ...o, selectedPrepTime: o.selectedPrepTime || null })));
      setError(null); // Clear error on successful fetch
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [orders.length]); // orders.length used in the newOrdersDetected check logic

  useEffect(() => {
    fetchOrders();
    // Optional: Set up polling for new orders
    const intervalId = setInterval(fetchOrders, 30000); // Poll every 30 seconds
    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  const handleAcceptOrder = async (orderId: number, prepTimeMinutes: number | null) => {
    if (prepTimeMinutes === null) {
      alert('Please select a preparation time before accepting the order.');
      return;
    }
    setIsLoading(true); // Indicate loading for this specific action
    try {
      const token = localStorage.getItem('token'); // Corrected key from adminToken to token
      if (!token) {
        setError('Admin token not found. Please log in again.');
        setIsLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ estimatedMinutes: prepTimeMinutes }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.error || errorData.message || `Failed to accept order: ${response.statusText}`);
      }
      const updatedOrder = await response.json();
      setOrders(prevOrders =>
        prevOrders.map(order => (order.id === orderId ? { ...order, ...updatedOrder, selectedPrepTime: prepTimeMinutes } : order))
      );
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to accept order');
      console.error(`Error accepting order ${orderId}:`, err);
      // Potentially show a more specific error to the user
    } finally {
      setIsLoading(false); // Reset general loading if it was set, or use specific loading states per order
    }
  };

  const handleDeclineOrder = async (orderId: number) => {
    setIsLoading(true); // Indicate loading for this specific action
    try {
      const token = localStorage.getItem('token'); // Corrected key from adminToken to token
      if (!token) {
        setError('Admin token not found. Please log in again.');
        setIsLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.error || errorData.message || `Failed to decline order: ${response.statusText}`);
      }
      const updatedOrder = await response.json();
      setOrders(prevOrders =>
        prevOrders.map(order => (order.id === orderId ? { ...order, ...updatedOrder } : order))
      );
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to decline order');
      console.error(`Error declining order ${orderId}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSelectedPrepTime = (orderId: number, time: number | null) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, selectedPrepTime: time } : order
      )
    );
  };

  if (isLoading && orders.length === 0) return <p className="text-white text-center py-10">Loading orders...</p>;
  // Do not show main error if orders are already displayed and it's a background refresh error
  // if (error && orders.length === 0) return <p className="text-red-500 bg-red-900 p-3 rounded text-center">Error: {error}</p>;


  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-yellow-400">Order Management</h2>
        <button
          onClick={fetchOrders} // Manual refresh button
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded transition duration-150 text-sm"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Orders'}
        </button>
      </div>
      {error && <p className="text-red-500 bg-red-800 p-3 rounded mb-4">Error refreshing orders: {error}. Displaying last known data.</p>}

      {orders.length === 0 && !isLoading ? (
        <p className="text-white text-center">No pending orders.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map(order => (
            <li key={order.id} className={`bg-gray-700 p-4 rounded-md shadow-sm border-l-4 ${order.status === 'PAYMENT_CONFIRMED' ? 'border-yellow-500' : order.status === 'CONFIRMED' ? 'border-green-500' : 'border-red-500'}`}>
              <div className="flex flex-col md:flex-row justify-between md:items-center">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-lg font-medium text-white">Order ID: {order.id} (User: {order.user?.name || order.user?.email || order.userId || 'Guest'})</h3>
                  <p className="text-sm text-gray-300">Received: {new Date(order.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-gray-300">Total: €{order.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-300">Status: <span className={`font-semibold ${order.status === 'PAYMENT_CONFIRMED' ? 'text-yellow-400' : order.status === 'CONFIRMED' ? 'text-green-400' : order.status === 'READY' ? 'text-blue-400' : 'text-red-400'}`}>{order.status}</span></p>
                  {order.fulfillmentMethod && (
                    <p className="text-sm text-gray-300">
                      Type: <span className="font-semibold">{order.fulfillmentMethod === 'DELIVERY' ? '🚚 Delivery' : '🏪 Pickup'}</span>
                      {order.fulfillmentMethod === 'DELIVERY' && order.deliveryAddress && (
                        <span className="block text-xs text-gray-400 mt-1">📍 {order.deliveryAddress}</span>
                      )}
                      {order.fulfillmentMethod === 'DELIVERY' && order.orderCode && (
                        <span className="block text-xs text-gray-400 mt-1">Code: {order.orderCode}</span>
                      )}
                    </p>
                  )}
                  {order.items.map(item => (
                    <p key={item.id} className="text-xs text-gray-400 pl-2">- {item.quantity}x {item.menuItem.name}</p>
                  ))}
                  {(order.status === 'CONFIRMED' || order.status === 'Accepted') && order.estimatedReadyTime && (
                    <p className="text-sm text-gray-300">Est. Ready: {new Date(order.estimatedReadyTime).toLocaleTimeString()}</p>
                  )}
                </div>
                <div className="flex flex-col space-y-2 md:space-y-0 md:space-x-2 md:items-center">
                  {(order.status === 'PAYMENT_CONFIRMED') && (
                    <div className="flex items-center space-x-2 mb-2 md:mb-0">
                      <span className="text-sm text-gray-300">Prep Time (min):</span>
                      <select
                        value={order.selectedPrepTime || ''}
                        onChange={(e) => handleSetSelectedPrepTime(order.id, e.target.value ? parseInt(e.target.value) : null)}
                        className="bg-gray-600 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="" disabled>Select</option>
                        {PREP_TIMES.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex space-x-2 mt-2 md:mt-0">
                    {(order.status === 'PAYMENT_CONFIRMED') && (
                      <>
                        <button
                          onClick={() => handleAcceptOrder(order.id, order.selectedPrepTime || null)}
                          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-150 w-full md:w-auto"
                          disabled={order.selectedPrepTime === null || isLoading}
                        >
                          {isLoading ? '...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleDeclineOrder(order.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150 w-full md:w-auto"
                          disabled={isLoading}
                        >
                          {isLoading ? '...' : 'Decline'}
                        </button>
                      </>
                    )}
                    {order.status === 'CONFIRMED' && (
                      <p className='text-green-400 font-semibold'>Order Confirmed</p>
                    )}
                    {order.status === 'CANCELLED' && (
                      <p className='text-red-400 font-semibold'>Order Cancelled</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 