'use client'

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface CustomizationOption {
    id: number;
    name: string;
    price: number;
    categoryId: number;
}

interface CustomizationCategory {
    id: number;
    name: string;
    options: CustomizationOption[];
}

const CustomizationManagement = () => {
    const [categories, setCategories] = useState<CustomizationCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Category Modals
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CustomizationCategory | null>(null);
    const [categoryName, setCategoryName] = useState('');

    // Option Modals
    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [editingOption, setEditingOption] = useState<CustomizationOption | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
    const [optionName, setOptionName] = useState('');
    const [optionPrice, setOptionPrice] = useState<string>('0');

    // Delete Dialogs
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'option', id: number } | null>(null);

    const [isPending, setIsPending] = useState(false);

    const fetchCategories = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/customization-categories`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message || 'Failed to fetch customization categories');
            setCategories(result.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) return;
        setIsPending(true);
        const token = localStorage.getItem('token');

        try {
            const url = editingCategory
                ? `${process.env.NEXT_PUBLIC_API_URL}/admin/customization-categories/${editingCategory.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/admin/customization-categories`;

            const method = editingCategory ? 'PUT' : 'POST';
            const body = editingCategory ? { name: categoryName } : { name: categoryName, options: [] };

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message || 'Failed to save category');

            await fetchCategories();
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            setCategoryName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save category');
        } finally {
            setIsPending(false);
        }
    };

    const handleSaveOption = async () => {
        if (!optionName.trim() || activeCategoryId === null) return;
        setIsPending(true);
        const token = localStorage.getItem('token');

        try {
            const url = editingOption
                ? `${process.env.NEXT_PUBLIC_API_URL}/admin/customization-options/${editingOption.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/admin/customization-categories/${activeCategoryId}/options`; // Wait, I need to check if I have this route or if I should add it

            // I don't have a specific "add option to category" route yet, but I can add it to the backend or use the category update. 
            // Actually, let's assume I'll add POST /admin/customization-options with categoryId in body or similar.
            // Let's check AdminController again.

            const response = await fetch(editingOption
                ? `${process.env.NEXT_PUBLIC_API_URL}/admin/customization-options/${editingOption.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/admin/customization-options`, {
                method: editingOption ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: optionName,
                    price: parseFloat(optionPrice),
                    categoryId: activeCategoryId
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message || 'Failed to save option');

            await fetchCategories();
            setIsOptionModalOpen(false);
            setEditingOption(null);
            setOptionName('');
            setOptionPrice('0');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save option');
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsPending(true);
        const token = localStorage.getItem('token');

        try {
            const endpoint = deleteTarget.type === 'category'
                ? `customization-categories/${deleteTarget.id}`
                : `customization-options/${deleteTarget.id}`;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/${endpoint}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message || 'Deletion failed');

            await fetchCategories();
            setIsDeleteDialogOpen(false);
            setDeleteTarget(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Deletion failed');
        } finally {
            setIsPending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-64 bg-gray-900 border border-yellow-400/20" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-yellow-500">Customization Assets</h2>
                <Button
                    onClick={() => {
                        setEditingCategory(null);
                        setCategoryName('');
                        setIsCategoryModalOpen(true);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </div>

            {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-500 text-white">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-6">
                {categories.length === 0 ? (
                    <div className="text-center py-20 bg-gray-950 border border-dashed border-yellow-400/20 rounded-lg">
                        <p className="text-gray-400">No customization categories found. Create your first one to get started!</p>
                    </div>
                ) : (
                    categories.map((category) => (
                        <Card key={category.id} className="bg-gray-950 border border-yellow-400/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div>
                                    <CardTitle className="text-xl text-yellow-500">{category.name}</CardTitle>
                                    <CardDescription className="text-gray-400">
                                        {category.options.length} {category.options.length === 1 ? 'option' : 'options'} available
                                    </CardDescription>
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setEditingCategory(category);
                                            setCategoryName(category.name);
                                            setIsCategoryModalOpen(true);
                                        }}
                                        className="text-gray-400 hover:text-yellow-500"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setDeleteTarget({ type: 'category', id: category.id });
                                            setIsDeleteDialogOpen(true);
                                        }}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setActiveCategoryId(category.id);
                                            setEditingOption(null);
                                            setOptionName('');
                                            setOptionPrice('0');
                                            setIsOptionModalOpen(true);
                                        }}
                                        size="sm"
                                        className="bg-gray-800 hover:bg-gray-700 text-yellow-500 border border-yellow-500/50"
                                    >
                                        <Plus className="mr-1 h-3 w-3" /> Add Option
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b border-yellow-400/10">
                                            <TableHead className="text-gray-400">Option Name</TableHead>
                                            <TableHead className="text-gray-400 text-right">Price</TableHead>
                                            <TableHead className="text-gray-400 text-center w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {category.options.map((option) => (
                                            <TableRow key={option.id} className="border-b border-yellow-400/10 hover:bg-gray-900/50">
                                                <TableCell className="font-medium text-white">{option.name}</TableCell>
                                                <TableCell className="text-right text-gray-300">€{option.price.toFixed(2)}</TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center space-x-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setActiveCategoryId(category.id);
                                                                setEditingOption(option);
                                                                setOptionName(option.name);
                                                                setOptionPrice(option.price.toString());
                                                                setIsOptionModalOpen(true);
                                                            }}
                                                            className="h-8 w-8 text-gray-400 hover:text-yellow-500"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setDeleteTarget({ type: 'option', id: option.id });
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {category.options.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-4 text-gray-500 italic">
                                                    No options in this category
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Category Modal */}
            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent className="bg-gray-950 border border-yellow-500/50 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-yellow-500">
                            {editingCategory ? 'Edit Category' : 'Add New Category'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Categories group options like &quot;Extras&quot;, &quot;Sauces&quot;, etc.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium text-gray-300 mb-2 block">Category Name</label>
                        <Input
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="e.g. Dipping Sauces"
                            className="bg-gray-900 border-gray-700 focus:border-yellow-500 text-white"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveCategory}
                            disabled={isPending || !categoryName.trim()}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingCategory ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Option Modal */}
            <Dialog open={isOptionModalOpen} onOpenChange={setIsOptionModalOpen}>
                <DialogContent className="bg-gray-950 border border-yellow-500/50 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-yellow-500">
                            {editingOption ? 'Edit Option' : 'Add New Option'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Define the name and price for this customization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">Option Name</label>
                            <Input
                                value={optionName}
                                onChange={(e) => setOptionName(e.target.value)}
                                placeholder="e.g. Extra Bacon"
                                className="bg-gray-900 border-gray-700 focus:border-yellow-500 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">Price (€)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={optionPrice}
                                onChange={(e) => setOptionPrice(e.target.value)}
                                className="bg-gray-900 border-gray-700 focus:border-yellow-500 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOptionModalOpen(false)} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveOption}
                            disabled={isPending || !optionName.trim()}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingOption ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-gray-950 border border-red-500/50 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500 font-bold flex items-center">
                            <Trash2 className="mr-2 h-5 w-5" />
                            Confirm Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            {deleteTarget?.type === 'category'
                                ? "Warning: Deleting this category will also remove all its options and their links to menu items. This action cannot be undone."
                                : "Are you sure you want to remove this customization option? Items currently using it will no longer have it available."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default CustomizationManagement;
