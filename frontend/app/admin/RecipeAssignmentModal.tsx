'use client'

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  currentQuantity: number;
  isActive: boolean;
}

interface RecipeIngredient {
  inventoryItemId: number;
  inventoryItemName: string;
  quantity: number;
}

interface MenuStockItem {
  id: number;
  name: string;
  recipe: RecipeIngredient[];
}

interface CustomizationOptionStock {
  id: number;
  name: string;
  recipe: RecipeIngredient[];
}

interface StockOverview {
  inventoryItems: InventoryItem[];
  menuItems: MenuStockItem[];
  customizationCategories: {
    id: number;
    name: string;
    options: CustomizationOptionStock[];
  }[];
}

interface RecipeAssignmentModalProps {
  entityType: 'menu' | 'option';
  entityId: number | null;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface DraftRow {
  inventoryItemId: string;
  quantity: string;
}

const emptyRow = (): DraftRow => ({ inventoryItemId: '', quantity: '1' });

function buildRows(recipe: RecipeIngredient[]): DraftRow[] {
  return recipe.length > 0
    ? recipe.map((ingredient) => ({
      inventoryItemId: ingredient.inventoryItemId.toString(),
      quantity: ingredient.quantity.toString(),
    }))
    : [emptyRow()];
}

export default function RecipeAssignmentModal({
  entityType,
  entityId,
  entityName,
  isOpen,
  onClose,
  onSaved,
}: RecipeAssignmentModalProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !entityId) {
      setRows([emptyRow()]);
      setInventoryItems([]);
      setError(null);
      setIsLoading(false);
      setIsSaving(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get('/admin/stock/overview');
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || result.message || 'Failed to load recipe data');
        }

        const overview = result.data as StockOverview;
        setInventoryItems(overview.inventoryItems.filter(item => item.isActive));

        if (entityType === 'menu') {
          const menuItem = overview.menuItems.find(item => item.id === entityId);
          setRows(buildRows(menuItem?.recipe || []));
        } else {
          const option = overview.customizationCategories
            .flatMap(category => category.options)
            .find(item => item.id === entityId);
          setRows(buildRows(option?.recipe || []));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load recipe data');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [entityId, entityType, isOpen]);

  const ingredientOptions = useMemo(
    () => inventoryItems.map(item => ({
      id: item.id,
      label: `${item.name} (${item.currentQuantity} ${item.unit})`
    })),
    [inventoryItems]
  );

  const updateRow = (index: number, field: keyof DraftRow, value: string) => {
    setRows(prev => prev.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    setRows(prev => {
      const next = prev.filter((_, rowIndex) => rowIndex !== index);
      return next.length > 0 ? next : [emptyRow()];
    });
  };

  const handleSave = async () => {
    if (!entityId) return;

    setIsSaving(true);
    setError(null);

    try {
      const ingredients = rows
        .filter(row => row.inventoryItemId && row.quantity)
        .map(row => ({
          inventoryItemId: parseInt(row.inventoryItemId, 10),
          quantity: parseFloat(row.quantity),
        }))
        .filter(row => Number.isFinite(row.inventoryItemId) && Number.isFinite(row.quantity) && row.quantity > 0);

      const endpoint = entityType === 'menu'
        ? `/admin/menu/${entityId}/recipe`
        : `/admin/customization-options/${entityId}/recipe`;

      const response = await api.put(endpoint, { ingredients });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to save recipe');
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-yellow-400/30 bg-gray-950 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Recipe for {entityName}</DialogTitle>
          <DialogDescription className="text-gray-300">
            Define the ingredient quantities consumed each time this {entityType === 'menu' ? 'menu item' : 'customization option'} is sold.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-500 bg-red-900/40 text-white">
                <AlertTitle>Recipe Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={`${entityType}-${entityId}-${index}`} className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_100px]">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Ingredient</Label>
                      <select
                        value={row.inventoryItemId}
                        onChange={(event) => updateRow(index, 'inventoryItemId', event.target.value)}
                        className="h-12 w-full rounded-md border border-gray-700 bg-gray-950 px-3 text-base text-white"
                      >
                        <option value="">Select ingredient</option>
                        {ingredientOptions.map(option => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Qty Used</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity}
                        onChange={(event) => updateRow(index, 'quantity', event.target.value)}
                        className="h-12 border-gray-700 bg-gray-950 text-base text-white"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeRow(index)}
                        disabled={rows.length === 1}
                        className="h-12 w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="h-12 border-gray-700 text-gray-200 hover:bg-gray-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Ingredient
            </Button>
          </div>
        )}

        <DialogFooter className="border-t border-gray-800 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="h-12 border-gray-700 text-gray-300 hover:bg-gray-800">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || isLoading} className="h-12 bg-yellow-500 text-black hover:bg-yellow-400">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
