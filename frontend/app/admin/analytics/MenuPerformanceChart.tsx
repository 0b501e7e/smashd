'use client'

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Trophy, Package, TrendingUp, BarChart3 } from 'lucide-react';
import { MenuPerformance } from '../../../lib/analyticsApi';

interface MenuPerformanceChartProps {
  data: MenuPerformance;
}

// Colors for the pie chart
const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F97316', '#06B6D4'];

export default function MenuPerformanceChart({ data }: MenuPerformanceChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare data for category chart
  const categoryChartData = data.categoryPerformance.map(cat => ({
    name: cat.category,
    revenue: cat.totalRevenue,
    orders: cat.totalOrders,
    avgOrderValue: cat.totalRevenue / (cat.totalOrders || 1)
  }));

  // Prepare data for top items bar chart
  const topItemsData = data.topItems.slice(0, 8).map(item => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    fullName: item.name,
    revenue: item.totalRevenue,
    quantity: item.totalQuantity,
    orders: item.totalOrders
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Items</CardTitle>
            <Package className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {data.summary.totalItems}
            </div>
            <p className="text-xs text-gray-400">
              unique menu items
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Categories</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {data.summary.totalCategories}
            </div>
            <p className="text-xs text-gray-400">
              menu categories
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(data.summary.totalItemRevenue)}
            </div>
            <p className="text-xs text-gray-400">
              from menu items
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Best Seller</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-yellow-400 truncate">
              {data.topItems[0]?.name || 'N/A'}
            </div>
            <p className="text-xs text-gray-400">
              {formatCurrency(data.topItems[0]?.totalRevenue || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Category Performance</CardTitle>
            <CardDescription className="text-gray-400">
              Revenue distribution by category ({data.period})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="revenue"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                          <p className="text-white font-medium">{data.name}</p>
                          <p className="text-green-400">Revenue: {formatCurrency(data.revenue)}</p>
                          <p className="text-blue-400">Orders: {data.orders}</p>
                          <p className="text-purple-400">Avg: {formatCurrency(data.avgOrderValue)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryChartData.map((category, index) => (
                <div key={category.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-300">{category.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Category Revenue Breakdown</CardTitle>
            <CardDescription className="text-gray-400">
              Revenue and order volume by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Items */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Top Performing Items</CardTitle>
          <CardDescription className="text-gray-400">
            Best sellers by revenue ({data.period})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topItemsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                        <p className="text-white font-medium">{data?.fullName}</p>
                        <p className="text-green-400">Revenue: {formatCurrency(data?.revenue || 0)}</p>
                        <p className="text-blue-400">Quantity Sold: {data?.quantity || 0}</p>
                        <p className="text-purple-400">Orders: {data?.orders || 0}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="revenue" fill="#F59E0B" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Items Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Detailed Item Performance</CardTitle>
          <CardDescription className="text-gray-400">
            Complete breakdown of all menu items ({data.period})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-300 font-medium">Rank</th>
                  <th className="text-left py-3 px-2 text-gray-300 font-medium">Item</th>
                  <th className="text-left py-3 px-2 text-gray-300 font-medium">Category</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Revenue</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Quantity</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Orders</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((item, index) => (
                  <tr key={item.itemId} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold">
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-white font-medium">{item.name}</td>
                    <td className="py-3 px-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right text-green-400 font-semibold">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="py-3 px-2 text-right text-blue-400">
                      {item.totalQuantity}
                    </td>
                    <td className="py-3 px-2 text-right text-purple-400">
                      {item.totalOrders}
                    </td>
                    <td className="py-3 px-2 text-right text-yellow-400">
                      {formatCurrency(item.totalRevenue / (item.totalQuantity || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 