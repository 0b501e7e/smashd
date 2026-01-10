'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../lib/apiConstants'; // Import API_BASE_URL
import { api } from '../../lib/api';

const PREP_TIMES = [15, 30, 45, 60]; // Available prep times in minutes

// Interface based on backend/server.js GET /v1/admin/orders
interface MenuItem {
  id: number;
  name: string;
}

interface OrderItem {
  id: number;
  menuItemId: number;
  quantity: number;
  price: number;
  customizations?: string | null;
  menuItem: MenuItem;
}

interface UserInfo {
  id: number;
  name?: string | null;
  email?: string | null;
}

interface Driver {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
}

interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  status: string;
  userId?: number | null;
  user?: UserInfo | null;
  driverId?: number | null;
  driver?: Driver | null;
  createdAt: string;
  updatedAt: string;
  estimatedReadyTime?: string | null;
  readyAt?: string | null;
  fulfillmentMethod?: 'PICKUP' | 'DELIVERY' | null;
  deliveryAddress?: string | null;
  orderCode?: string | null;
  selectedPrepTime?: number | null;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
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
      const response = await api.get('/admin/orders');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `HTTP error ${response.status}`);
      }
      const fetchedOrders: Order[] = result.data || [];

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

  const fetchDrivers = React.useCallback(async () => {
    try {
      const response = await api.get('/admin/drivers/available');
      const result = await response.json();
      if (response.ok) {
        setAvailableDrivers(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching drivers:", err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    const intervalId = setInterval(() => {
      fetchOrders();
      fetchDrivers();
    }, 15000); // Poll every 15 seconds for more responsiveness
    return () => clearInterval(intervalId);
  }, [fetchOrders, fetchDrivers]);

  const handleAcceptOrder = async (orderId: number, prepTimeMinutes: number | null) => {
    if (prepTimeMinutes === null) {
      alert('Please select a preparation time before accepting the order.');
      return;
    }
    setIsLoading(true); // Indicate loading for this specific action
    try {
      const response = await api.post(`/admin/orders/${orderId}/accept`, { estimatedMinutes: prepTimeMinutes });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to accept order: ${response.statusText}`);
      }
      const updatedOrder = result.data;
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
      const response = await api.post(`/admin/orders/${orderId}/decline`, {});
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to decline order: ${response.statusText}`);
      }
      const updatedOrder = result.data;
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

  const handleMarkReady = async (orderId: number) => {
    setIsLoading(true);
    try {
      const response = await api.post(`/admin/orders/${orderId}/ready`, {});
      if (!response.ok) throw new Error('Failed to mark order as ready');
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDriver = async (orderId: number, driverId: number) => {
    setIsLoading(true);
    try {
      const response = await api.post(`/admin/orders/${orderId}/assign-driver`, { driverId });
      if (!response.ok) throw new Error('Failed to assign driver');
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAYMENT_CONFIRMED': return 'border-yellow-500';
      case 'CONFIRMED':
      case 'PREPARING': return 'border-blue-500';
      case 'READY': return 'border-green-500';
      case 'OUT_FOR_DELIVERY': return 'border-purple-500';
      default: return 'border-gray-500';
    }
  };

  const renderOrderCard = (order: Order) => {
    const isLate = order.estimatedReadyTime && new Date() > new Date(order.estimatedReadyTime);

    return (
      <div key={order.id} className={`bg-gray-700 p-4 rounded-lg shadow-md border-l-4 ${getStatusColor(order.status)} mb-4 transition-all hover:scale-[1.02]`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">#{order.id}</span>
            <h4 className="text-lg font-bold text-white leading-tight">{order.user?.name || 'Guest'}</h4>
            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-yellow-400">€{order.total.toFixed(2)}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${order.fulfillmentMethod === 'DELIVERY' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'}`}>
              {order.fulfillmentMethod || 'PICKUP'}
            </span>
          </div>
        </div>

        <div className="space-y-1 mb-3">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between text-sm text-gray-300">
              <span>{item.quantity}x {item.menuItem.name}</span>
            </div>
          ))}
        </div>

        {order.deliveryAddress && (
          <div className="mb-3 p-2 bg-gray-800 rounded text-xs text-gray-300">
            📍 {order.deliveryAddress}
          </div>
        )}

        <div className="mt-4">
          {order.status === 'PAYMENT_CONFIRMED' && (
            <div className="space-y-2">
              <select
                value={order.selectedPrepTime || ''}
                onChange={(e) => handleSetSelectedPrepTime(order.id, parseInt(e.target.value))}
                className="w-full bg-gray-600 text-white p-2 rounded text-sm outline-none"
              >
                <option value="" disabled>Select Prep Time</option>
                {PREP_TIMES.map(t => <option key={t} value={t}>{t} mins</option>)}
              </select>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAcceptOrder(order.id, order.selectedPrepTime || null)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded text-sm transition"
                  disabled={!order.selectedPrepTime}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDeclineOrder(order.id)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded text-sm transition"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {(order.status === 'CONFIRMED' || order.status === 'PREPARING') && (
            <div>
              <div className={`text-xs mb-2 font-bold ${isLate ? 'text-red-400' : 'text-gray-400'}`}>
                {isLate ? '⚠️ LATE' : `Est. Ready: ${new Date(order.estimatedReadyTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </div>
              <button
                onClick={() => handleMarkReady(order.id)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-sm transition"
              >
                Mark Ready
              </button>
            </div>
          )}

          {order.status === 'READY' && (
            <div className="space-y-2">
              {order.fulfillmentMethod === 'DELIVERY' ? (
                <>
                  <select
                    onChange={(e) => handleAssignDriver(order.id, parseInt(e.target.value))}
                    className="w-full bg-gray-600 text-white p-2 rounded text-sm outline-none border border-purple-500"
                    defaultValue=""
                  >
                    <option value="" disabled>Assign Driver...</option>
                    {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <p className="text-[10px] text-center text-gray-500">Wait for Driver to collect</p>
                </>
              ) : (
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded text-sm transition"
                >
                  Complete Pickup
                </button>
              )}
            </div>
          )}

          {order.status === 'OUT_FOR_DELIVERY' && (
            <div className="text-center p-2 bg-purple-900/30 rounded border border-purple-500/30">
              <p className="text-xs font-bold text-purple-300">🚚 OUT WITH {order.driver?.name?.toUpperCase() || 'DRIVER'}</p>
              <p className="text-[10px] text-purple-400 mt-1">Started: {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading && orders.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
      <p className="text-gray-400">Booting Command Center...</p>
    </div>
  );

  const filterOrders = (statuses: string[]) => orders.filter(o => statuses.includes(o.status));

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">COMMAND <span className="text-yellow-400">CENTER</span></h1>
          <p className="text-gray-400 text-sm">{availableDrivers.length} Drivers Online • {orders.length} Active Orders</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right hidden md:block">
            <p className="text-xs text-gray-500 uppercase font-black">Daily Revenue</p>
            <p className="text-xl font-black text-green-400">€{orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</p>
          </div>
          <button
            onClick={fetchOrders}
            className="group relative flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl transition-all border border-gray-700"
            disabled={isLoading}
          >
            <span className={`${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`}>🔄</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 flex items-center shadow-lg">
          <span className="mr-3">⚠️</span>
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* NEW ORDERS */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-black text-yellow-500 uppercase tracking-widest">Incoming</h3>
            <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[10px] font-black">
              {filterOrders(['PAYMENT_CONFIRMED']).length}
            </span>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-2xl flex-1 border border-gray-700/50 min-h-[400px]">
            {filterOrders(['PAYMENT_CONFIRMED']).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                <span className="text-4xl mb-2">📥</span>
                <p className="text-xs font-bold uppercase">Quiet night...</p>
              </div>
            ) : (
              filterOrders(['PAYMENT_CONFIRMED']).map(renderOrderCard)
            )}
          </div>
        </div>

        {/* KITCHEN / PREPARING */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest">Kitchen</h3>
            <span className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded text-[10px] font-black">
              {filterOrders(['CONFIRMED', 'PREPARING']).length}
            </span>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-2xl flex-1 border border-gray-700/50">
            {filterOrders(['CONFIRMED', 'PREPARING']).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                <span className="text-4xl mb-2">👨‍🍳</span>
                <p className="text-xs font-bold uppercase">Kitchen Clear</p>
              </div>
            ) : (
              filterOrders(['CONFIRMED', 'PREPARING']).map(renderOrderCard)
            )}
          </div>
        </div>

        {/* READY / DISPATCH */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-black text-green-500 uppercase tracking-widest">Ready</h3>
            <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded text-[10px] font-black">
              {filterOrders(['READY']).length}
            </span>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-2xl flex-1 border border-gray-700/50">
            {filterOrders(['READY']).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                <span className="text-4xl mb-2">🥡</span>
                <p className="text-xs font-bold uppercase">Nothing Ready</p>
              </div>
            ) : (
              filterOrders(['READY']).map(renderOrderCard)
            )}
          </div>
        </div>

        {/* OUT FOR DELIVERY */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-black text-purple-500 uppercase tracking-widest">On Road</h3>
            <span className="bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded text-[10px] font-black">
              {filterOrders(['OUT_FOR_DELIVERY']).length}
            </span>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-2xl flex-1 border border-gray-700/50">
            {filterOrders(['OUT_FOR_DELIVERY']).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                <span className="text-4xl mb-2">🚚</span>
                <p className="text-xs font-bold uppercase">No Deliveries</p>
              </div>
            ) : (
              filterOrders(['OUT_FOR_DELIVERY']).map(renderOrderCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 