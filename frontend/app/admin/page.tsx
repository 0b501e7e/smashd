'use client'

import React from 'react';
import AdminAuthWrapper from './AdminAuthWrapper';
import MenuList from './MenuList';

export default function AdminDashboardPage() {
  return (
    <AdminAuthWrapper>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-6 text-yellow-400">Admin Dashboard</h1>
        <p className="text-white mb-6">Welcome to the admin area. Manage your restaurant details below.</p>

        {/* Menu Management Section */}
        <MenuList />

        {/* TODO: Add components for managing restaurant details, orders, etc. */}
      </div>
    </AdminAuthWrapper>
  );
} 