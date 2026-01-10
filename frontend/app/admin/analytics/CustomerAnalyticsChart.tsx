'use client'

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Users, UserPlus, UserCheck, TrendingUp, Heart } from 'lucide-react';
import { CustomerAnalytics } from '../../../lib/analyticsApi';

interface CustomerAnalyticsChartProps {
  data: CustomerAnalytics;
}

export default function CustomerAnalyticsChart({ data }: CustomerAnalyticsChartProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  const chartData = data.weeklyData.slice().reverse().map(week => ({
    ...week,
    weekStart: formatDate(week.weekStart),
    retentionRate: week.totalCustomers > 0 ? (week.returningCustomers / week.totalCustomers) * 100 : 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`Week of ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name.includes('Rate') ? '%' : ''}
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
            <CardTitle className="text-sm font-medium text-gray-300">New Customers</CardTitle>
            <UserPlus className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {data.summary.totalNewCustomers}
            </div>
            <p className="text-xs text-gray-400">
              {data.summary.avgNewCustomersPerWeek.toFixed(1)} per week avg
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Returning Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {data.summary.totalReturningCustomers}
            </div>
            <p className="text-xs text-gray-400">
              {data.summary.avgReturningCustomersPerWeek.toFixed(1)} per week avg
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Retention Rate</CardTitle>
            <Heart className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {data.summary.retentionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400">
              customer loyalty
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {data.summary.totalNewCustomers + data.summary.totalReturningCustomers}
            </div>
            <p className="text-xs text-gray-400">
              total unique customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Acquisition Trend */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Customer Acquisition Trend</CardTitle>
          <CardDescription className="text-gray-400">
            New vs returning customers over {data.summary.period}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="weekStart"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="newCustomers"
                stackId="1"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.8}
                name="New Customers"
              />
              <Area
                type="monotone"
                dataKey="returningCustomers"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.8}
                name="Returning Customers"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Customer Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Customer Growth</CardTitle>
            <CardDescription className="text-gray-400">
              Weekly customer acquisition and retention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
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
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="newCustomers"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                  name="New Customers"
                />
                <Line
                  type="monotone"
                  dataKey="returningCustomers"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
                  name="Returning Customers"
                />
                <Line
                  type="monotone"
                  dataKey="totalCustomers"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                  name="Total Customers"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Retention Rate Trend</CardTitle>
            <CardDescription className="text-gray-400">
              Percentage of returning customers each week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="weekStart"
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                          <p className="text-white font-medium">{`Week of ${label}`}</p>
                          <p className="text-red-400">
                            Retention Rate: {payload[0]?.value?.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="retentionRate"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.3}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Type Comparison */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Customer Type Comparison</CardTitle>
          <CardDescription className="text-gray-400">
            Side-by-side comparison of new vs returning customers
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
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="newCustomers"
                fill="#10B981"
                name="New Customers"
                opacity={0.8}
              />
              <Bar
                dataKey="returningCustomers"
                fill="#3B82F6"
                name="Returning Customers"
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Customer Breakdown Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Weekly Customer Breakdown</CardTitle>
          <CardDescription className="text-gray-400">
            Detailed customer metrics by week ({data.summary.period})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-300 font-medium">Week</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">New</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Returning</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Total</th>
                  <th className="text-right py-3 px-2 text-gray-300 font-medium">Retention %</th>
                  <th className="text-center py-3 px-2 text-gray-300 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.weeklyData.slice().reverse().map((week, index) => {
                  const retentionRate = week.totalCustomers > 0 ? (week.returningCustomers / week.totalCustomers) * 100 : 0;
                  const isGoodRetention = retentionRate >= 50;

                  return (
                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-2 text-white">{formatDate(week.weekStart)}</td>
                      <td className="py-3 px-2 text-right text-green-400 font-medium">
                        {week.newCustomers}
                      </td>
                      <td className="py-3 px-2 text-right text-blue-400 font-medium">
                        {week.returningCustomers}
                      </td>
                      <td className="py-3 px-2 text-right text-purple-400 font-medium">
                        {week.totalCustomers}
                      </td>
                      <td className="py-3 px-2 text-right text-red-400 font-medium">
                        {retentionRate.toFixed(1)}%
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant={isGoodRetention ? "default" : "secondary"}
                          className={`text-xs ${isGoodRetention ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                        >
                          {isGoodRetention ? 'Good' : 'Poor'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Insights */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Customer Insights</CardTitle>
          <CardDescription className="text-gray-400">
            Key takeaways from customer behavior analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-white">Acquisition Performance</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• Average {data.summary.avgNewCustomersPerWeek.toFixed(1)} new customers per week</p>
                <p>• Total of {data.summary.totalNewCustomers} new customers acquired</p>
                <p>• {data.summary.totalReturningCustomers} customers have returned</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-white">Retention Analysis</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• Overall retention rate: {data.summary.retentionRate.toFixed(1)}%</p>
                <p>• {data.summary.retentionRate >= 50 ? 'Strong' : 'Needs improvement'} customer loyalty</p>
                <p>• Focus on {data.summary.retentionRate < 50 ? 'improving retention strategies' : 'maintaining current quality'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 