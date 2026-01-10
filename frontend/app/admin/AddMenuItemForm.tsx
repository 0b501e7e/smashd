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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, PlusCircle } from 'lucide-react';
import Image from 'next/image'; // For image preview
import { api } from '@/lib/api';

interface MenuItem {
  id?: number; // ID is optional for new items
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  originalPrice?: number;
  promotionTitle?: string;
  vatRate?: number;
}

interface AddMenuItemFormProps {
  onItemAdded: () => void; // Callback to refresh the list after adding
}

const initialFormData = {
  name: '',
  description: '',
  price: '',
  category: 'BURGER', // Default category
  imageUrl: '',
  originalPrice: '',
  promotionTitle: '',
  vatRate: '0.10',
};

const AddMenuItemForm: React.FC<AddMenuItemFormProps> = ({ onItemAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    // Reset form and errors when dialog opens
    if (isOpen) {
      setFormData(initialFormData);
      setSelectedFile(null);
      setImagePreview(null);
      setError(null);
      setError(null);
      setIsLoading(false);
      setIsPromoting(false);
    }
  }, [isOpen]);

  // Separate useEffect for image preview cleanup
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(imagePreview);
        } catch (e) {
          // Mobile Chrome can throw if URL already revoked, silently ignore
        }
      }
    };
  }, [imagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      if (imagePreview && imagePreview.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(imagePreview); // Clean up previous blob URL
        } catch (e) {
          // Mobile Chrome can throw if already revoked
        }
      }
      setImagePreview(previewUrl);
      // No need to set formData.imageUrl here yet, will be set after successful upload
    } else {
      setSelectedFile(null);
      if (imagePreview && imagePreview.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(imagePreview);
        } catch (e) {
          // Mobile Chrome can throw if already revoked
        }
      }
      setImagePreview(null);
      // If a file was previously selected and now cleared, also clear from formData if it was a blob
      // However, actual imageUrl in formData should only be set from server response or existing data
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    let finalImageUrl = formData.imageUrl; // Use existing if no new file

    const price = parseFloat(formData.price);
    const originalPrice = isPromoting ? parseFloat(formData.originalPrice) : undefined;
    const vatRate = parseFloat(formData.vatRate) || 0.10;

    if (!formData.name || !formData.category || formData.price === '' || isNaN(price) || price <= 0) {
      setError("Name, Category, and a valid Price are required.");
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

    if (!finalImageUrl && !selectedFile) {
      setError("Menu item image is required. Please select an image to upload.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/admin/menu', {
        ...formData,
        price,
        imageUrl: finalImageUrl,
        originalPrice: isPromoting ? originalPrice : undefined,
        promotionTitle: isPromoting ? formData.promotionTitle : undefined,
        vatRate
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to add menu item: ${response.statusText}`);
      }

      // Clean up blob URL before closing dialog (mobile Chrome fix)
      if (imagePreview && imagePreview.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(imagePreview);
        } catch (e) {
          // Ignore revocation errors on mobile
        }
      }

      setIsLoading(false);
      setImagePreview(null); // Clear preview before closing
      setIsOpen(false);

      // Defer parent refresh until after dialog closes (mobile Chrome DOM race condition fix)
      // Increased to 500ms to allow Radix UI exit animations to fully complete
      setTimeout(() => {
        onItemAdded();
      }, 500);
    } catch (err) {
      console.error('Add Item Error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-yellow-400 hover:bg-yellow-300 text-black">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-gray-950 border-yellow-400/30 text-white"> {/* Increased width slightly */}
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Add New Menu Item</DialogTitle>
          <DialogDescription className="text-gray-300">
            Fill in the details for the new menu item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name-add" className="text-gray-300">Name</Label>
            <Input
              id="name-add"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>
          <div>
            <Label htmlFor="category-add" className="text-gray-300">Category</Label>
            {/* Simple select for category, can be replaced with shadcn/ui Select if available */}
            <select
              name="category"
              id="category-add"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="mt-1 block w-full bg-input border border-border text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring rounded-md shadow-sm py-2 px-3 focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="BURGER">Burger</option>
              <option value="SIDE">Side</option>
              <option value="DRINK">Drink</option>
              <option value="DESSERT">Dessert</option>
            </select>
          </div>
          <div>
            <Label htmlFor="description-add" className="text-gray-300">Description</Label>
            <Textarea
              id="description-add"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>
          <div className="flex items-center space-x-2 my-4">
            <input
              type="checkbox"
              id="isPromoting-add"
              checked={isPromoting}
              onChange={(e) => setIsPromoting(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
            />
            <Label htmlFor="isPromoting-add" className="text-yellow-400 font-medium cursor-pointer select-none">Promote this Item (On Sale)</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price-add" className="text-gray-300">
                {isPromoting ? "Sale Price (€)" : "Price (€)"}
              </Label>
              <Input
                id="price-add"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleChange}
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>

            {isPromoting && (
              <>
                <div>
                  <Label htmlFor="originalPrice-add" className="text-gray-300">Regular Price (€)</Label>
                  <Input
                    id="originalPrice-add"
                    name="originalPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Was..."
                    value={formData.originalPrice}
                    onChange={handleChange}
                    className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                    required={isPromoting}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="promotionTitle-add" className="text-gray-300">Promotion Label (Opt.)</Label>
                  <Input
                    id="promotionTitle-add"
                    name="promotionTitle"
                    placeholder="e.g. 50% OFF!"
                    value={formData.promotionTitle}
                    onChange={handleChange}
                    className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-2">
            <Label htmlFor="vatRate-add" className="text-gray-300">VAT Rate (0.10 = 10%)</Label>
            <Input
              id="vatRate-add"
              name="vatRate"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.vatRate}
              onChange={handleChange}
              className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <Label htmlFor="image-add" className="text-gray-300">Menu Item Image</Label>
            <Input
              id="image-add"
              name="menuItemImage" // Name for the backend to identify the file part
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" // Mobile Chrome requires no spaces
              onChange={handleFileChange}
              className="mt-1 bg-input border-border text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-300"
            />
            {imagePreview && (
              <div className="mt-3 relative w-full h-48 border border-gray-700 rounded-md overflow-hidden">
                <Image src={imagePreview} alt="Image Preview" fill style={{ objectFit: "contain" }} unoptimized />
              </div>
            )}
            {/* Display existing image URL if no new preview and imageUrl exists from a previous attempt or default */}
            {!imagePreview && formData.imageUrl && (
              <div className="mt-3 relative w-full h-48 border border-gray-700 rounded-md overflow-hidden">
                <Image src={formData.imageUrl} alt="Current Menu Item Image" fill style={{ objectFit: "contain" }} unoptimized />
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error Adding Item</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!selectedFile && !formData.imageUrl)}> {/* Disable if no file and no existing URL */}
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