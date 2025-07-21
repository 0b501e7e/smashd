'use client'

import React, { useState, useEffect } from 'react';
import { analyticsAPI, WeeklyAnalytics, RevenueAnalytics, MenuPerformance, CustomerAnalytics } from '../../lib/analyticsApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Clock, BarChart3, RefreshCw } from 'lucide-react';
import RevenueChart from './analytics/RevenueChart';
import MenuPerformanceChart from './analytics/MenuPerformanceChart';
import CustomerAnalyticsChart from './analytics/CustomerAnalyticsChart';

export default function Analytics() {
  const [currentWeek, setCurrentWeek] = useState<WeeklyAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [menuData, setMenuData] = useState<MenuPerformance | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all analytics data in parallel
      const [currentWeekData, revenueAnalytics, menuPerformance, customerAnalytics] = await Promise.all([
        analyticsAPI.getCurrentWeek(),
        analyticsAPI.getRevenue(8),
        analyticsAPI.getMenuPerformance(4),
        analyticsAPI.getCustomers(4)
      ]);

      setCurrentWeek(currentWeekData);
      setRevenueData(revenueAnalytics);
      setMenuData(menuPerformance);
      setCustomerData(customerAnalytics);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const handleGenerateWeekly = async () => {
    try {
      setRefreshing(true);
      await analyticsAPI.generateWeeklyAnalytics();
      await loadAnalyticsData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate weekly analytics');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">
          {error}
          <Button 
            onClick={loadAnalyticsData} 
            variant="outline" 
            size="sm" 
            className="ml-4"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-yellow-400">Analytics Dashboard</h2>
          <p className="text-gray-400 mt-1">
            Business insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleGenerateWeekly}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/20"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Current Week Overview Cards */}
      {currentWeek && (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Current Week ({formatDate(currentWeek.weekStartDate)} - {formatDate(currentWeek.weekEndDate)})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(currentWeek.totalRevenue)}
                </div>
                <p className="text-xs text-gray-400">
                  {formatCurrency(currentWeek.revenuePerHour)}/hour average
                </p>
              </CardContent>
            </Card>

            {/* Total Orders */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {currentWeek.totalOrders}
                </div>
                <p className="text-xs text-gray-400">
                  {formatCurrency(currentWeek.avgOrderValue)} average order
                </p>
              </CardContent>
            </Card>

            {/* Customers */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Customers</CardTitle>
                <Users className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">
                  {currentWeek.totalCustomers}
                </div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {currentWeek.newCustomers} new
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentWeek.returningCustomers} returning
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Operating Hours */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Efficiency</CardTitle>
                <Clock className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">
                  {currentWeek.revenuePerHour > 0 ? Math.round(currentWeek.totalOrders / 28) : 0}
                </div>
                <p className="text-xs text-gray-400">
                  orders/hour (28h week)
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-900 border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="menu" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Menu Performance
          </TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            {revenueData && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Trend</CardTitle>
                  <CardDescription>
                    {revenueData.summary.growthRate >= 0 ? (
                      <span className="flex items-center text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{revenueData.summary.growthRate.toFixed(1)}% growth
                      </span>
                    ) : (
                      <span className="flex items-center text-red-400">
                        <TrendingDown className="h-4 w-4 mr-1" />
                        {revenueData.summary.growthRate.toFixed(1)}% decline
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RevenueChart data={revenueData} compact />
                </CardContent>
              </Card>
            )}

            {/* Top Items */}
            {menuData && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Top Performing Items</CardTitle>
                  <CardDescription>Best sellers by revenue ({menuData.period})</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {menuData.topItems.slice(0, 5).map((item, index) => (
                      <div key={item.itemId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-black text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.category} • {item.totalOrders} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-400">
                            {formatCurrency(item.totalRevenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          {revenueData && <RevenueChart data={revenueData} />}
        </TabsContent>

        <TabsContent value="menu">
          {menuData && <MenuPerformanceChart data={menuData} />}
        </TabsContent>

        <TabsContent value="customers">
          {customerData && <CustomerAnalyticsChart data={customerData} />}
        </TabsContent>
      </Tabs>
    </div>
  );
} 