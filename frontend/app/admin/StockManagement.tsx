'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Plus, RotateCcw, Save } from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  currentQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isLowStock: boolean;
}

interface StockOverview {
  inventoryItems: InventoryItem[];
}

interface DraftItem {
  name: string;
  unit: string;
  currentQuantity: string;
  lowStockThreshold: string;
  adjustment: string;
}

const formatQuantity = (value: number) => (
  Number.isInteger(value) ? value.toString() : value.toFixed(2)
);

export default function StockManagement() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftItem>>({});
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: 'unit',
    currentQuantity: '0',
    lowStockThreshold: '0'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const totalLowStock = useMemo(
    () => inventoryItems.filter(item => item.isActive && item.isLowStock).length,
    [inventoryItems]
  );

  const syncDrafts = (items: InventoryItem[]) => {
    setDrafts(
      Object.fromEntries(
        items.map(item => [item.id, {
          name: item.name,
          unit: item.unit,
          currentQuantity: formatQuantity(item.currentQuantity),
          lowStockThreshold: formatQuantity(item.lowStockThreshold),
          adjustment: '0'
        }])
      )
    );
  };

  const fetchStockOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get('/admin/stock/overview');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to load stock overview');
      }

      const overview = result.data as StockOverview;
      setInventoryItems(overview.inventoryItems || []);
      syncDrafts(overview.inventoryItems || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock overview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockOverview();
  }, [fetchStockOverview]);

  const setDraftField = (id: number, field: keyof DraftItem, value: string) => {
    setDrafts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleCreateIngredient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newIngredient.name.trim()) {
      setError('Ingredient name is required');
      return;
    }

    setPendingKey('create');
    setError(null);

    try {
      const response = await api.post('/admin/inventory', {
        name: newIngredient.name.trim(),
        unit: newIngredient.unit.trim() || 'unit',
        currentQuantity: parseFloat(newIngredient.currentQuantity || '0'),
        lowStockThreshold: parseFloat(newIngredient.lowStockThreshold || '0'),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create ingredient');
      }

      setNewIngredient({
        name: '',
        unit: 'unit',
        currentQuantity: '0',
        lowStockThreshold: '0'
      });
      await fetchStockOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to create ingredient');
    } finally {
      setPendingKey(null);
    }
  };

  const handleSaveIngredient = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;

    setPendingKey(`save-${id}`);
    setError(null);

    try {
      const response = await api.put(`/admin/inventory/${id}`, {
        name: draft.name.trim(),
        unit: draft.unit.trim() || 'unit',
        currentQuantity: parseFloat(draft.currentQuantity || '0'),
        lowStockThreshold: parseFloat(draft.lowStockThreshold || '0'),
        isActive: true
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to save ingredient');
      }
      await fetchStockOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to save ingredient');
    } finally {
      setPendingKey(null);
    }
  };

  const handleAdjustment = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;

    const quantityDelta = parseFloat(draft.adjustment || '0');
    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      setError('Adjustment must be a non-zero number');
      return;
    }

    setPendingKey(`adjust-${id}`);
    setError(null);

    try {
      const response = await api.post(`/admin/inventory/${id}/adjust`, { quantityDelta });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to adjust ingredient');
      }
      await fetchStockOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust ingredient');
    } finally {
      setPendingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-white">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-yellow-400">Ingredient Stock</h2>
        <p className="mt-1 text-sm text-gray-400">
          Enter the quantities you have on hand and keep them topped up as orders deplete stock.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-900/40 text-white">
          <AlertTitle>Stock Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-yellow-400/20 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-gray-400">Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-white">{inventoryItems.length}</CardContent>
        </Card>
        <Card className="border-yellow-400/20 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-gray-400">Low Stock</CardTitle>
          </CardHeader>
          <CardContent className={`text-3xl font-bold ${totalLowStock > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {totalLowStock}
          </CardContent>
        </Card>
        <Card className="border-yellow-400/20 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-gray-400">Workflow</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-300">
            Recipes now live in Menu Management and Customization Assets.
          </CardContent>
        </Card>
      </div>

      <Card className="border-yellow-400/20 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-yellow-400">Add Ingredient</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateIngredient} className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Name</Label>
              <Input
                value={newIngredient.name}
                onChange={(event) => setNewIngredient(prev => ({ ...prev, name: event.target.value }))}
                className="h-12 border-gray-700 bg-gray-950 text-base text-white"
                placeholder="Beef Patty"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Unit</Label>
              <Input
                value={newIngredient.unit}
                onChange={(event) => setNewIngredient(prev => ({ ...prev, unit: event.target.value }))}
                className="h-12 border-gray-700 bg-gray-950 text-base text-white"
                placeholder="pieces"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Starting Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={newIngredient.currentQuantity}
                onChange={(event) => setNewIngredient(prev => ({ ...prev, currentQuantity: event.target.value }))}
                className="h-12 border-gray-700 bg-gray-950 text-base text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Low Stock At</Label>
              <Input
                type="number"
                step="0.01"
                value={newIngredient.lowStockThreshold}
                onChange={(event) => setNewIngredient(prev => ({ ...prev, lowStockThreshold: event.target.value }))}
                className="h-12 border-gray-700 bg-gray-950 text-base text-white"
              />
            </div>
            <div className="md:col-span-4">
              <Button type="submit" className="h-12 bg-yellow-500 text-black hover:bg-yellow-400" disabled={pendingKey === 'create'}>
                {pendingKey === 'create' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Ingredient
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {inventoryItems.map(item => {
          const draft = drafts[item.id];
          return (
            <Card key={item.id} className={`border ${item.isLowStock ? 'border-red-500/40' : 'border-yellow-400/20'} bg-gray-900`}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-white">{item.name}</CardTitle>
                    <p className="text-sm text-gray-400">
                      Current: {formatQuantity(item.currentQuantity)} {item.unit}
                    </p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isLowStock ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {item.isLowStock ? 'Low Stock' : 'OK'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Name</Label>
                    <Input
                      value={draft?.name || ''}
                      onChange={(event) => setDraftField(item.id, 'name', event.target.value)}
                      className="h-12 border-gray-700 bg-gray-950 text-base text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Unit</Label>
                    <Input
                      value={draft?.unit || ''}
                      onChange={(event) => setDraftField(item.id, 'unit', event.target.value)}
                      className="h-12 border-gray-700 bg-gray-950 text-base text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Quantity On Hand</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft?.currentQuantity || '0'}
                      onChange={(event) => setDraftField(item.id, 'currentQuantity', event.target.value)}
                      className="h-12 border-gray-700 bg-gray-950 text-base text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Low Stock Threshold</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft?.lowStockThreshold || '0'}
                      onChange={(event) => setDraftField(item.id, 'lowStockThreshold', event.target.value)}
                      className="h-12 border-gray-700 bg-gray-950 text-base text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Adjustment</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft?.adjustment || '0'}
                      onChange={(event) => setDraftField(item.id, 'adjustment', event.target.value)}
                      className="h-12 border-gray-700 bg-gray-950 text-base text-white"
                      placeholder="Use +20 or -5"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAdjustment(item.id)}
                      disabled={pendingKey === `adjust-${item.id}`}
                      className="h-12 w-full border-gray-700 text-gray-200 hover:bg-gray-800"
                    >
                      {pendingKey === `adjust-${item.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                      Apply
                    </Button>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={() => handleSaveIngredient(item.id)}
                      disabled={pendingKey === `save-${item.id}`}
                      className="h-12 w-full bg-yellow-500 text-black hover:bg-yellow-400"
                    >
                      {pendingKey === `save-${item.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Ingredient
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
