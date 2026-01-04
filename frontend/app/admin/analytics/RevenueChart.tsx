'use client'

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { TrendingUp, TrendingDown, Euro, ShoppingCart } from 'lucide-react';
import { RevenueAnalytics } from '../../../lib/analyticsApi';

interface RevenueChartProps {
  data: RevenueAnalytics;
  compact?: boolean;
}

export default function RevenueChart({ data, compact = false }: RevenueChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  const chartData = data.weeklyData.map(week => ({
    ...week,
    weekStart: formatDate(week.weekStart),
    formattedRevenue: formatCurrency(week.revenue)
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`Week of ${label}`}</p>
          <p className="text-green-400">
            Revenue: {formatCurrency(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="text-blue-400">
              Orders: {payload[1].value}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="weekStart"
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `€${Math.round(value)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Revenue</CardTitle>
            <Euro className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(data.summary.totalRevenue)}
            </div>
            <p className="text-xs text-gray-400">
              {data.summary.period}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Weekly Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {formatCurrency(data.summary.avgWeeklyRevenue)}
            </div>
            <p className="text-xs text-gray-400">
              per week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Growth Rate</CardTitle>
            {data.summary.growthRate >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.summary.growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.summary.growthRate >= 0 ? '+' : ''}{data.summary.growthRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400">
              week-over-week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Revenue Trend</CardTitle>
          <CardDescription className="text-gray-400">
            Weekly revenue performance over {data.summary.period}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="weekStart"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: '#10B981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders vs Revenue */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Orders vs Revenue</CardTitle>
          <CardDescription className="text-gray-400">
            Correlation between order volume and revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="weekStart"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `€${Math.round(value)}`}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                        <p className="text-white font-medium">{`Week of ${label}`}</p>
                        <p className="text-green-400">
                          Revenue: {formatCurrency(payload[0]?.value || 0)}
                        </p>
                        <p className="text-blue-400">
                          Orders: {payload[1]?.value || 0}
                        </p>
                        <p className="text-purple-400">
                          Avg Order: {formatCurrency((payload[0]?.value || 0) / (payload[1]?.value || 1))}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="#10B981"
                name="Revenue"
                opacity={0.8}
              />
              <Bar
                yAxisId="orders"
                dataKey="orders"
                fill="#3B82F6"
                name="Orders"
                opacity={0.6}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Performance Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Weekly Breakdown</CardTitle>
          <CardDescription className="text-gray-400">
            Detailed performance metrics by week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-300 font-medium">Week</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Revenue</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Orders</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Avg Order</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">€/Hour</th>
                </tr>
              </thead>
              <tbody>
                {data.weeklyData.map((week, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-2 text-white">{formatDate(week.weekStart)}</td>
                    <td className="py-3 px-2 text-right text-green-400 font-medium">
                      {formatCurrency(week.revenue)}
                    </td>
                    <td className="py-3 px-2 text-right text-blue-400">
                      {week.orders}
                    </td>
                    <td className="py-3 px-2 text-right text-purple-400">
                      {formatCurrency(week.avgOrderValue)}
                    </td>
                    <td className="py-3 px-2 text-right text-yellow-400">
                      {formatCurrency(week.revenuePerHour)}
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