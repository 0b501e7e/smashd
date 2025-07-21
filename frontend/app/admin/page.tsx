'use client'

import React, { useState } from 'react';
import AdminAuthWrapper from './AdminAuthWrapper';
import MenuList from './MenuList';
import OrderManagement from './OrderManagement';
import StockManagement from './StockManagement';
import AdminSettings from './Settings';
import Analytics from './Analytics';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('menu');

  return (
    <AdminAuthWrapper>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-6 text-yellow-400">Admin Dashboard</h1>
        <p className="text-white mb-6">Welcome to the admin area. Manage your restaurant details below.</p>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('menu')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm 
                          ${activeTab === 'menu' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
            >
              Menu Management
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm 
                          ${activeTab === 'orders' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
            >
              Order Management
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm 
                          ${activeTab === 'stock' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
            >
              Stock Management
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm 
                          ${activeTab === 'analytics' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm 
                          ${activeTab === 'settings' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'menu' && <MenuList />}
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'stock' && <StockManagement />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'settings' && <AdminSettings />}

        {/* TODO: Add components for managing restaurant details, etc. */}
      </div>
    </AdminAuthWrapper>
  );
} 