'use client'

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';

// Types
interface MenuItem {
  id: number;
  name: string;
}

// Represents an individual customization option (e.g., Ketchup, Lettuce)
interface CustomizationOptionWithCategory {
  id: number;
  name: string;
  price: number;
  category: { // Category is included for display grouping
    id: number;
    name: string;
  };
}

interface ManageCustomizationsModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  // onCustomizationsUpdated?: () => void; // If parent needs to refresh
}

const ManageCustomizationsModal: React.FC<ManageCustomizationsModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const [allOptions, setAllOptions] = useState<CustomizationOptionWithCategory[]>([]);
  const [linkedOptionIds, setLinkedOptionIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all available customization options
  const fetchAllCustomizationOptions = useCallback(async () => {
    try {
      const response = await api.get('/admin/customization-options');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || 'Failed to fetch all customization options');
      setAllOptions(result.data || []);
    } catch (err) {
      console.error("Fetch All Options Error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching options');
    }
  }, []);

  // Fetch IDs of options currently linked to the menu item
  const fetchLinkedOptionIds = useCallback(async (menuItemId: number): Promise<Set<number>> => {
    try {
      const response = await api.get(`/admin/customization-options/${menuItemId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || 'Failed to fetch linked customization options');
      // Expecting result.data to be { optionIds: number[] }
      return new Set(result.data?.optionIds || []);
    } catch (err) {
      console.error("Fetch Linked Options Error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching linked options');
      return new Set<number>(); // Return empty set on error
    }
  }, []);

  useEffect(() => {
    if (isOpen && item) {
      setIsLoading(true);
      setError(null); // Clear previous errors
      Promise.all([
        fetchAllCustomizationOptions(),
        fetchLinkedOptionIds(item.id).then(ids => {
          setLinkedOptionIds(new Set(ids));
        })
      ]).finally(() => setIsLoading(false));
    } else {
      // Reset state when modal is closed or no item
      setAllOptions([]);
      setLinkedOptionIds(new Set());
      setError(null);
      setIsLoading(false);
      setIsSaving(false);
    }
  }, [isOpen, item, fetchAllCustomizationOptions, fetchLinkedOptionIds]);

  const handleOptionToggle = (optionId: number) => {
    setLinkedOptionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (!item) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await api.post(`/admin/customization-options/${item.id}`, { optionIds: Array.from(linkedOptionIds) });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to save changes (status: ${response.status})`);
      }

      // if (onCustomizationsUpdated) onCustomizationsUpdated();
      onClose();
    } catch (err) {
      console.error("Save Linked Options Error:", err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  // Group options by category for display
  const groupedOptions = allOptions.reduce((acc, option) => {
    const categoryName = option.category.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(option);
    return acc;
  }, {} as Record<string, CustomizationOptionWithCategory[]>);

  if (!isOpen || !item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-gray-950 border-yellow-400/30 text-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Manage Customizations for {item.name}</DialogTitle>
          <DialogDescription className="text-gray-300">
            Select all individual customization options (e.g., toppings, sauces) that apply to this item.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center items-center h-60">
            <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="destructive" className="my-4">
            <X className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (
          <>
            <ScrollArea className="max-h-[60vh] my-4 pr-6"> {/* Adjust max-height as needed */}
              {Object.keys(groupedOptions).length === 0 && !isLoading && (
                <p className="text-gray-400 py-4">No customization options found. Please create them first in the Customization Options/Categories section.</p>
              )}
              {Object.entries(groupedOptions).map(([categoryName, optionsInCategory]) => (
                <div key={categoryName} className="mb-6">
                  <h4 className="text-lg font-semibold text-yellow-300 mb-2 border-b border-gray-700 pb-1">
                    {categoryName}
                  </h4>
                  <div className="space-y-2">
                    {optionsInCategory.map((option) => (
                      <div key={option.id} className="flex items-center space-x-3 p-2.5 rounded-md hover:bg-gray-800/60 transition-colors duration-150">
                        <Checkbox
                          id={`option-${option.id}`}
                          checked={linkedOptionIds.has(option.id)}
                          onCheckedChange={() => handleOptionToggle(option.id)}
                          className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black h-5 w-5"
                        />
                        <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer text-gray-100 text-sm">
                          {option.name}
                          {option.price > 0 && (
                            <span className="text-xs text-gray-400 ml-2">(+€{option.price.toFixed(2)})</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
            <DialogFooter className="pt-6 border-t border-gray-800">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving} className="hover:bg-gray-700">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving || isLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManageCustomizationsModal; 