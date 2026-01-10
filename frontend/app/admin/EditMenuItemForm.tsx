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
import Image from 'next/image'; // For image preview
import { api } from '@/lib/api';

// Re-use the MenuItem interface (consider moving to a shared types file later)
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string; // Keep optional, but new uploads will make it mandatory for saving
  category: string;
  isAvailable?: boolean; // Added based on PUT endpoint fields
  originalPrice?: number | null;
  promotionTitle?: string | null;
  vatRate?: number;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isPromoting, setIsPromoting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setEditedItem(item);
      setError(null);
      setIsLoading(false);

      setIsPromoting(!!item.originalPrice); // Set promoting state based on existence of originalPrice
      // Set initial image preview from item.imageUrl if it exists
      if (item.imageUrl) {
        let fullImageUrl = item.imageUrl;
        if (item.imageUrl.startsWith('/')) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          if (apiUrl) {
            try {
              const urlObject = new URL(apiUrl); // e.g., http://localhost:5001/v1
              const baseUrl = `${urlObject.protocol}//${urlObject.host}`; // e.g., http://localhost:5001
              fullImageUrl = `${baseUrl}${item.imageUrl}`;
            } catch (e) {
              console.error("Error constructing full image URL from NEXT_PUBLIC_API_URL:", e, "Using relative path as fallback.");
              // Fallback to relative path if URL parsing fails
            }
          }
        }
        setImagePreview(fullImageUrl);
      } else {
        setImagePreview(null);
      }
    }
  }, [item, isOpen]);

  // Separate useEffect for image preview cleanup
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview); // Clean up previous blob URL
      }
      setImagePreview(previewUrl);
      // Update editedItem.imageUrl optimistically for preview, but actual save uses server URL
      // setEditedItem(prev => prev ? { ...prev, imageUrl: previewUrl } : null);
    } else {
      setSelectedFile(null);
      // If file input is cleared, revert preview to original item image or null
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(editedItem?.imageUrl || null);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setError("Cloudinary configuration missing. Please check environment variables.");
      return null;
    }

    const imageFormData = new FormData();
    imageFormData.append('file', file);
    imageFormData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: imageFormData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `Failed to upload image: ${response.statusText}`);
      }

      return result.secure_url;
    } catch (uploadError) {
      console.error("Image Upload Error:", uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'An unknown error occurred during image upload');
      return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editedItem) return;
    const { name, value } = e.target;
    let processedValue: string | number | boolean = value;
    if (name === 'price') {
      processedValue = value === '' ? '' : (parseFloat(value) || 0);
    } else if (name === 'isAvailable') {
      processedValue = value === 'true';
    }

    setEditedItem(prev => prev ? {
      ...prev,
      [name]: processedValue,
    } : null);
  };

  const handlePromotionToggle = (checked: boolean) => {
    setIsPromoting(checked);
    if (!checked) {
      // Clear promotion fields when disabling
      setEditedItem(prev => prev ? {
        ...prev,
        originalPrice: null,
        promotionTitle: null
      } : null);
    } else {
      // Default original price to current price if empty when enabling
      setEditedItem(prev => prev ? {
        ...prev,
        originalPrice: prev.price
      } : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedItem) return;
    setIsLoading(true);
    setError(null);
    const price = typeof editedItem.price === 'string' ? (parseFloat(editedItem.price) || 0) : editedItem.price;
    let finalImageUrl = editedItem.imageUrl; // Start with existing URL

    if (!editedItem.name || !editedItem.category || price < 0) { // Price can be 0 or more
      setError("Name, Category, and a valid Price are required.");
      setIsLoading(false);
      return;
    }

    if (isPromoting && (!editedItem.originalPrice || editedItem.originalPrice <= price)) {
      setError("For promotions, Regular Price must be greater than Sale Price.");
      setIsLoading(false);
      return;
    }

    if (selectedFile) {
      const uploadedUrl = await uploadImage(selectedFile);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        setIsLoading(false);
        return; // Stop if image upload failed
      }
    }

    // If after attempting upload (if a file was selected) or if no file was ever selected,
    // and there's STILL no finalImageUrl, then it's an error (e.g. initial item had no image and none was provided)
    if (!finalImageUrl) {
      setError("Menu item image is required. Please upload an image or ensure one was previously set.");
      setIsLoading(false);
      return;
    }

    const itemDataToUpdate = {
      ...editedItem,
      price,
      imageUrl: finalImageUrl,
      isAvailable: editedItem.isAvailable === undefined ? true : editedItem.isAvailable // Default to true if not set
    };

    try {
      const response = await api.put(`/admin/menu/${editedItem.id}`, itemDataToUpdate);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to update menu item: ${response.statusText}`);
      }
      setIsLoading(false);
      onItemUpdated();
      onClose(); // Close modal on success
    } catch (err) {
      console.error('Update Item Error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setError(null);
    setSelectedFile(null);
    setImagePreview(null);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  if (!item || !editedItem) return null; // Ensure editedItem is also available

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-gray-950 border-yellow-400/30 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Edit Menu Item</DialogTitle>
          <DialogDescription className="text-gray-300">
            Update the details for &quot;{item.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        {/* Render form only if editedItem is not null */}
        {editedItem && (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor={`name-edit-${item.id}`} className="text-gray-300">Name</Label>
              <Input
                id={`name-edit-${item.id}`}
                name="name"
                value={editedItem.name}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
            <div>
              <Label htmlFor={`category-edit-${item.id}`} className="text-gray-300">Category</Label>
              <select
                name="category"
                id={`category-edit-${item.id}`}
                value={editedItem.category}
                onChange={handleChange}
                className="mt-1 block w-full bg-input border border-border text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring rounded-md shadow-sm py-2 px-3 focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="BURGER">Burger</option>
                <option value="SIDE">Side</option>
                <option value="DRINK">Drink</option>
                <option value="DESSERT">Dessert</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`description-edit-${item.id}`} className="text-gray-300">Description</Label>
              <Textarea
                id={`description-edit-${item.id}`}
                name="description"
                value={editedItem.description}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center space-x-2 my-4">
              <input
                type="checkbox"
                id="isPromoting"
                checked={isPromoting}
                onChange={(e) => handlePromotionToggle(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <Label htmlFor="isPromoting" className="text-yellow-400 font-medium cursor-pointer select-none">Promote this Item (On Sale)</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`price-edit-${item.id}`} className="text-gray-300">
                  {isPromoting ? "Sale Price (€)" : "Price (€)"}
                </Label>
                <Input
                  id={`price-edit-${item.id}`}
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

              {isPromoting && (
                <>
                  <div>
                    <Label htmlFor={`originalPrice-edit-${item.id}`} className="text-gray-300">Regular Price (€)</Label>
                    <Input
                      id={`originalPrice-edit-${item.id}`}
                      name="originalPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedItem.originalPrice || ''}
                      onChange={(e) => setEditedItem(prev => prev ? { ...prev, originalPrice: parseFloat(e.target.value) } : null)}
                      className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                      required={isPromoting}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`promotionTitle-edit-${item.id}`} className="text-gray-300">Promotion Label (Opt.)</Label>
                    <Input
                      id={`promotionTitle-edit-${item.id}`}
                      name="promotionTitle"
                      placeholder="e.g. 50% OFF!"
                      value={editedItem.promotionTitle || ''}
                      onChange={(e) => setEditedItem(prev => prev ? { ...prev, promotionTitle: e.target.value } : null)}
                      className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-2">
              <Label htmlFor={`vatRate-edit-${item.id}`} className="text-gray-300">VAT Rate (0.10 = 10%)</Label>
              <Input
                id={`vatRate-edit-${item.id}`}
                name="vatRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={editedItem.vatRate || 0.10}
                onChange={(e) => setEditedItem(prev => prev ? { ...prev, vatRate: parseFloat(e.target.value) } : null)}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <Label htmlFor={`isAvailable-edit-${item.id}`} className="text-gray-300">Available</Label>
              <select
                name="isAvailable"
                id={`isAvailable-edit-${item.id}`}
                value={editedItem.isAvailable === undefined ? 'true' : String(editedItem.isAvailable)}
                onChange={handleChange}
                className="mt-1 block w-full bg-input border border-border text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring rounded-md shadow-sm py-2 px-3 focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`imageUrl-edit-${item.id}`} className="text-gray-300">Menu Item Image</Label>
              <Input
                id={`imageUrl-edit-${item.id}`}
                name="menuItemImage"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileChange}
                className="mt-1 bg-input border-border text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-300"
              />
              {/* Show new image preview if a file is selected, otherwise show existing image */}
              {imagePreview && (
                <div className="mt-3 relative w-full h-48 border border-gray-700 rounded-md overflow-hidden">
                  {/* Use unoptimized for blob URLs to avoid Next.js image optimization errors */}
                  <Image src={imagePreview} alt={selectedFile ? "New image preview" : "Current image"} fill className="object-contain" unoptimized={imagePreview.startsWith('blob:') || !imagePreview.startsWith('/')} />
                </div>
              )}
            </div>
            {error && (
              <Alert variant="destructive" className="my-2">
                <AlertTitle>Error Updating Item</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading || (!editedItem.imageUrl && !selectedFile)}> {/* Disable if no image and no new file selected */}
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