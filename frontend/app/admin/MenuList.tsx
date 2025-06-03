'use client'

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Loader2, Settings2 } from 'lucide-react';
import AddMenuItemForm from './AddMenuItemForm';
import EditMenuItemForm from './EditMenuItemForm';
import ManageCustomizationsModal from './ManageCustomizationsModal';

// Assuming MenuItem type structure based on BasketContext and common fields
// TODO: Potentially refine this based on exact API response
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string; // Optional image URL
  category: string;
  // Add other relevant fields from the backend model if necessary
}

// Skeleton component for loading state
function MenuListSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-1/4 bg-gray-800" />
        <Skeleton className="h-10 w-24 bg-primary" /> {/* Button placeholder */}
      </div>
      <Table className="bg-gray-950 border border-yellow-400/20">
        <TableHeader>
          <TableRow className="hover:bg-gray-800/50 border-b border-yellow-400/20">
            <TableHead><Skeleton className="h-5 w-1/5 bg-gray-700" /></TableHead>
            <TableHead><Skeleton className="h-5 w-1/5 bg-gray-700" /></TableHead>
            <TableHead><Skeleton className="h-5 w-2/5 bg-gray-700" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-5 w-1/6 bg-gray-700 inline-block" /></TableHead>
            <TableHead className="text-center"><Skeleton className="h-5 w-1/6 bg-gray-700 inline-block" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(3)].map((_, i) => (
            <TableRow key={i} className="hover:bg-gray-800/50 border-b border-yellow-400/20">
              <TableCell><Skeleton className="h-4 w-3/4 bg-gray-700" /></TableCell>
              <TableCell><Skeleton className="h-4 w-1/2 bg-gray-700" /></TableCell>
              <TableCell><Skeleton className="h-4 w-full bg-gray-700" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-1/3 bg-gray-700 inline-block" /></TableCell>
              <TableCell className="text-center">
                <Skeleton className="h-6 w-6 inline-block mr-2 bg-yellow-700/50 rounded-md" />
                <Skeleton className="h-6 w-6 inline-block bg-orange-700/50 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const MenuList = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // State for customization modal
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [itemForCustomization, setItemForCustomization] = useState<MenuItem | null>(null);

  const fetchMenuItems = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
        setIsLoading(true); // Initial load indicator
        setIsApiLoading(true); // Or API loading indicator
    }
    setError(null);
    setApiError(null);
    const token = localStorage.getItem('token');

    if (!token) {
      setError("Authentication token not found.");
      setIsLoading(false);
      setIsApiLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch menu items: ${response.statusText}`);
      }

      const data: MenuItem[] = await response.json();
      setMenuItems(data);
    } catch (err) {
      console.error('Fetch Menu Error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
      setIsApiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems(true);
  }, [fetchMenuItems]);

  const handleEditItem = (item: MenuItem) => {
    setApiError(null); // Clear previous API errors
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setItemToEdit(null);
  };

  const handleOpenCustomizationModal = (item: MenuItem) => {
    setApiError(null); // Clear previous API errors
    setItemForCustomization(item);
    setIsCustomizationModalOpen(true);
  };

  const handleCloseCustomizationModal = () => {
    setIsCustomizationModalOpen(false);
    setItemForCustomization(null);
  };

  const handleDeleteItem = (item: MenuItem) => {
    setApiError(null); // Clear previous API errors
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsApiLoading(true);
    setApiError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setApiError("Authentication token not found.");
      setIsApiLoading(false);
      return;
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/menu/${itemToDelete.id}`, { // Ensure using admin endpoint
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` })); // Graceful JSON parse error handling
        throw new Error(errorData.error || `Failed to delete menu item: ${response.statusText}`);
      }
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchMenuItems(false);
    } catch (err) {
      console.error('Delete Menu Error:', err);
      setApiError(err instanceof Error ? err.message : 'An unknown error occurred during deletion');
      // Keep dialog open on error
    } finally {
      setIsApiLoading(false);
    }
  };

  const cancelDeleteItem = () => {
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
    setApiError(null); // Clear error when cancelling
  };

  // Use Skeleton component for initial loading
  if (isLoading) return <MenuListSkeleton />;

  // Use Alert for fetch error
  if (error) return (
    <Alert variant="destructive" className="mt-6">
      <AlertTitle>Error Loading Menu</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  return (
    <div className="mt-10"> { /* Increased top margin */}
      <div className="flex justify-between items-center mb-6"> { /* Increased bottom margin */}
          <h2 className="text-2xl font-semibold text-yellow-300">Menu Items</h2>
          {/* Assume AddMenuItemForm uses a Button internally */}
          <AddMenuItemForm onItemAdded={() => fetchMenuItems(false)} />
      </div>

      {/* Use Alert for API errors (add/edit/delete failures) */}
      {apiError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Operation Failed</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
      )}

      {/* Update Table styling */}
      <Table className="bg-gray-950 border border-yellow-400/20">
        <TableHeader>
          {/* Update header row styles */}
          <TableRow className="hover:bg-gray-800/50 border-b border-yellow-400/30">
            {/* Update header cell text color */}
            <TableHead className="text-yellow-300">Name</TableHead>
            <TableHead className="text-yellow-300">Category</TableHead>
            <TableHead className="text-yellow-300">Description</TableHead>
            <TableHead className="text-yellow-300 text-right">Price</TableHead>
            <TableHead className="text-yellow-300 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menuItems.length > 0 ? (
            menuItems.map((item) => (
              // Update table row styles
              <TableRow key={item.id} className="hover:bg-gray-800/50 border-b border-yellow-400/20">
                <TableCell className="font-medium text-white">{item.name}</TableCell>
                <TableCell className="text-gray-300">{item.category}</TableCell>
                <TableCell className="text-gray-300">{item.description}</TableCell>
                <TableCell className="text-white text-right">€{item.price.toFixed(2)}</TableCell>
                <TableCell className="text-center space-x-1"> { /* Add space */}
                   {/* Edit button styling is okay */}
                  <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} className="text-yellow-400 hover:text-yellow-300" title="Edit Item">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {/* Customizations button */}
                  <Button variant="ghost" size="icon" onClick={() => handleOpenCustomizationModal(item)} className="text-blue-400 hover:text-blue-300" title="Manage Customizations">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                   {/* Delete button uses ghost variant + orange text */}
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item)} className="text-orange-400 hover:text-orange-300" title="Delete Item">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-400 py-6">No menu items found.</TableCell> { /* Add padding */}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Assume EditMenuItemForm uses Dialog/Sheet and is styled internally */}
      <EditMenuItemForm
        item={itemToEdit}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onItemUpdated={() => fetchMenuItems(false)}
      />

      {/* Update Delete Confirmation Dialog styles */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-950 border-yellow-400/30 text-white">
          <AlertDialogHeader>
            {/* Update title style */}
            <AlertDialogTitle className="text-yellow-300">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 pt-2"> {/* Add padding */}
              This action cannot be undone. This will permanently delete the menu item:
              <br /><strong className="text-white">{itemToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Add loading spinner and Alert for API error within dialog */}
          {isApiLoading && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-yellow-400" /></div>}
          {apiError && (
            <Alert variant="destructive" className="my-2">
                <AlertTitle>Deletion Failed</AlertTitle>
                <AlertDescription>{apiError}</AlertDescription>
            </Alert>
           )}
          <AlertDialogFooter className="pt-4"> { /* Add padding */}
            <AlertDialogCancel onClick={cancelDeleteItem} disabled={isApiLoading}>Cancel</AlertDialogCancel> {/* Default styling is ok */}
            {/* Remove variant="destructive" from AlertDialogAction */}
            <AlertDialogAction onClick={confirmDeleteItem} disabled={isApiLoading}>
              {isApiLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Placeholder for ManageCustomizationsModal - will be created next */}
      
      <ManageCustomizationsModal
        item={itemForCustomization}
        isOpen={isCustomizationModalOpen}
        onClose={handleCloseCustomizationModal}
        // onCustomizationsUpdated={() => fetchMenuItems(false)} // Might not need to refetch all menu items
      />
      
    </div>
  );
};

export default MenuList; 