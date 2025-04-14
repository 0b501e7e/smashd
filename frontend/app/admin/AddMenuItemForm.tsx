'use client'

import React, { useState } from 'react';
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, Loader2 } from 'lucide-react';

interface MenuItem {
  id?: number; // ID is optional for new items
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
}

interface AddMenuItemFormProps {
  onItemAdded: () => void; // Callback to refresh the list after adding
}

const AddMenuItemForm: React.FC<AddMenuItemFormProps> = ({ onItemAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newItem, setNewItem] = useState<MenuItem>({
    name: '',
    description: '',
    price: 0,
    category: '',
    imageUrl: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

    if (!token) {
      setError("Authentication token not found.");
      setIsLoading(false);
      return;
    }

    // Basic validation
    if (!newItem.name || !newItem.category || newItem.price <= 0) {
        setError("Name, Category, and a valid Price are required.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `Failed to add menu item: ${response.statusText}`);
      }

      setIsLoading(false);
      setIsOpen(false);
      onItemAdded();
      setNewItem({ name: '', description: '', price: 0, category: '', imageUrl: '' });

    } catch (err) {
      console.error('Add Item Error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setError(null); }}>
      <DialogTrigger asChild>
         <Button>
             <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
         </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-950 border-yellow-400/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Add New Menu Item</DialogTitle>
          <DialogDescription className="text-gray-300">
            Fill in the details for the new menu item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Name</Label>
              <Input
                id="name"
                name="name"
                value={newItem.name}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
            <div>
              <Label htmlFor="category" className="text-gray-300">Category</Label>
              <Input
                id="category"
                name="category"
                value={newItem.category}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g., BURGER, SIDE, DRINK"
                required
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={newItem.description}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <Label htmlFor="price" className="text-gray-300">Price (€)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={newItem.price}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
            <div>
              <Label htmlFor="imageUrl" className="text-gray-300">Image URL</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                value={newItem.imageUrl}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
             {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
             )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMenuItemForm; 