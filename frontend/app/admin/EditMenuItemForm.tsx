'use client'

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';

// Re-use the MenuItem interface (consider moving to a shared types file later)
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
}

interface EditMenuItemFormProps {
  item: MenuItem | null; // Item to edit, or null if dialog closed
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: () => void; // Callback to refresh list
}

const EditMenuItemForm: React.FC<EditMenuItemFormProps> = ({ item, isOpen, onClose, onItemUpdated }) => {
  const [editedItem, setEditedItem] = useState<MenuItem | null>(item);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEditedItem(item);
    if (isOpen) {
      setError(null);
      setIsLoading(false);
    }
  }, [item, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editedItem) return;
    const { name, value } = e.target;
    setEditedItem(prev => prev ? {
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value,
    } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedItem) return;
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication token not found.");
      setIsLoading(false);
      return;
    }
    if (!editedItem.name || !editedItem.category || editedItem.price <= 0) {
      setError("Name, Category, and a valid Price are required.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/menu/${editedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editedItem),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `Failed to update menu item: ${response.statusText}`);
      }
      setIsLoading(false);
      onItemUpdated();
      onClose();
    } catch (err) {
      console.error('Update Item Error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-950 border-yellow-400/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Edit Menu Item</DialogTitle>
          <DialogDescription className="text-gray-300">
            Update the details for &quot;{item.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        {editedItem && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name-edit" className="text-gray-300">Name</Label>
              <Input
                id="name-edit"
                name="name"
                value={editedItem.name}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
            <div>
              <Label htmlFor="category-edit" className="text-gray-300">Category</Label>
              <Input
                id="category-edit"
                name="category"
                value={editedItem.category}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
            <div>
              <Label htmlFor="description-edit" className="text-gray-300">Description</Label>
              <Textarea
                id="description-edit"
                name="description"
                value={editedItem.description}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <Label htmlFor="price-edit" className="text-gray-300">Price (€)</Label>
              <Input
                id="price-edit"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={editedItem.price}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
            <div>
              <Label htmlFor="imageUrl-edit" className="text-gray-300">Image URL</Label>
              <Input
                id="imageUrl-edit"
                name="imageUrl"
                value={editedItem.imageUrl || ''}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error Updating Item</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditMenuItemForm; 