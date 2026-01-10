'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { MenuItem, BasketItem, useBasket, CustomizationSelection } from './BasketContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogClose } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Plus, Minus, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from '@/lib/api';

// --- Define Types for Fetched Customization Data ---
type FetchedCustomizationOption = {
    id: number; // Use number ID from DB
    categoryId: number;
    name: string;
    price: number;
    isDefaultSelected: boolean;
};

type FetchedCustomizationCategory = {
    id: number;
    name: string; // e.g., "Extras", "Sauces", "Toppings"
    options: FetchedCustomizationOption[];
};

interface ItemCustomizationProps {
    item: MenuItem | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ItemCustomization({ item, isOpen, onOpenChange }: ItemCustomizationProps) {
    const { addToBasket } = useBasket();
    const [quantity, setQuantity] = useState(1);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    // State for fetched customization data
    const [customizationCategories, setCustomizationCategories] = useState<FetchedCustomizationCategory[]>([]);
    const [isLoadingCustomizations, setIsLoadingCustomizations] = useState(true);
    const [customizationError, setCustomizationError] = useState<string | null>(null);

    // State for selected customization IDs (now using number IDs)
    const [selectedOptions, setSelectedOptions] = useState<{ [categoryId: number]: number[] }>({});

    const [isImageLoading, setIsImageLoading] = useState(true);
    const [imageLoadError, setImageLoadError] = useState(false);

    // Fetch customization data
    useEffect(() => {
        const fetchCustomizations = async () => {
            setIsLoadingCustomizations(true);
            setCustomizationError(null);
            try {
                const response = await api.get('/menu/customizations');
                const responseData = await response.json();
                // Handle new API response structure
                const data: FetchedCustomizationCategory[] = responseData.data || responseData;
                setCustomizationCategories(data);
            } catch (err) {
                console.error("Fetch Customization Error:", err);
                setCustomizationError(err instanceof Error ? err.message : 'No se pudieron cargar las opciones');
            } finally {
                setIsLoadingCustomizations(false);
            }
        };

        fetchCustomizations();
    }, []); // Fetch once on mount

    // Initialize selections when categories load or item changes
    useEffect(() => {
        if (isOpen && item && customizationCategories.length > 0) {
            const initialSelections: { [categoryId: number]: number[] } = {};
            if (item.category === 'BURGER') { // Only apply defaults for burgers
                customizationCategories.forEach(category => {
                    initialSelections[category.id] = category.options
                        .filter(option => option.isDefaultSelected)
                        .map(option => option.id);
                });
            }
            setSelectedOptions(initialSelections);
        } else if (!isOpen) {
            // Clear selections when closed
            setSelectedOptions({});
        }
    }, [isOpen, item, customizationCategories]); // Depend on fetched categories

    // Reset image loading state
    useEffect(() => {
        if (isOpen) {
            setIsImageLoading(true);
            setImageLoadError(false);
        }
    }, [isOpen, item]); // Reset on item change too


    // Calculate total price based on fetched options
    const calculateTotalPrice = useMemo(() => {
        if (!item || customizationCategories.length === 0) return 0;

        let customizationCost = 0;
        customizationCategories.forEach(category => {
            const selectedInCategory = selectedOptions[category.id] || [];
            selectedInCategory.forEach(optionId => {
                const option = category.options.find(o => o.id === optionId);
                customizationCost += option?.price || 0;
            });
        });

        const totalItemPrice = item.price + customizationCost;
        return totalItemPrice * quantity;
    }, [item, quantity, selectedOptions, customizationCategories]);

    if (!item) return null;

    const handleQuantityChange = (amount: number) => {
        setQuantity(prev => Math.max(1, prev + amount));
    };

    // Toggle selection using numeric IDs and category ID
    const toggleSelection = (categoryId: number, optionId: number) => {
        setSelectedOptions(prevSelected => {
            const currentCategorySelection = prevSelected[categoryId] || [];
            const newCategorySelection = currentCategorySelection.includes(optionId)
                ? currentCategorySelection.filter(id => id !== optionId)
                : [...currentCategorySelection, optionId];
            return {
                ...prevSelected,
                [categoryId]: newCategorySelection,
            };
        });
    };

    // Update basket click handler to use fetched data
    const handleAddToBasketClick = () => {
        if (!item || customizationCategories.length === 0) return;

        const customizationDetails: CustomizationSelection = {
            extras: [], // Initialize with explicit keys
            sauces: [],
            toppings: [],
        };
        const allSelectedOptions: FetchedCustomizationOption[] = [];

        customizationCategories.forEach(category => {
            const selectedInCategory = selectedOptions[category.id] || [];

            selectedInCategory.forEach(optionId => {
                const option = category.options.find(o => o.id === optionId);
                if (option) {
                    // Assign to the correct key based on category name
                    if (category.name === 'Extras') {
                        customizationDetails.extras?.push(option.name);
                    } else if (category.name === 'Sauces') {
                        customizationDetails.sauces?.push(option.name);
                    } else if (category.name === 'Toppings') {
                        customizationDetails.toppings?.push(option.name);
                    }
                    allSelectedOptions.push(option);
                }
            });
        });

        // Remove empty arrays if no options were selected in a category
        if (customizationDetails.extras?.length === 0) delete customizationDetails.extras;
        if (customizationDetails.sauces?.length === 0) delete customizationDetails.sauces;
        if (customizationDetails.toppings?.length === 0) delete customizationDetails.toppings;

        const unitPriceWithCustomizations = calculateTotalPrice / quantity;

        const itemToAdd: Omit<BasketItem, 'cartItemId'> = {
            menuItemId: item.id,
            name: item.name,
            quantity: quantity,
            unitPrice: unitPriceWithCustomizations,
            imageUrl: item.imageUrl,
            customizations: item.category === 'BURGER' && allSelectedOptions.length > 0 ? customizationDetails : undefined,
        };
        addToBasket(itemToAdd);
        onOpenChange(false);
    };

    const handleImageError = () => {
        setIsImageLoading(false);
        setImageLoadError(true);
    };

    // Render customization options dynamically
    const renderOptions = (category: FetchedCustomizationCategory) => {
        const selectedInCategory = selectedOptions[category.id] || [];
        return (
            <div key={category.id} className="mb-4">
                <h4 className="font-semibold mb-3 text-lg text-yellow-300">{category.name}</h4>
                <div className="space-y-2">
                    {category.options.map(option => (
                        <div key={option.id} className="flex items-center justify-between space-x-2 p-2 rounded hover:bg-gray-800/60">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`option-${option.id}`}
                                    checked={selectedInCategory.includes(option.id)}
                                    onCheckedChange={() => toggleSelection(category.id, option.id)}
                                    className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black"
                                />
                                <Label htmlFor={`option-${option.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer break-words">
                                    {option.name === 'Extras' ? 'Extras' : option.name === 'Sauces' ? 'Salsas' : option.name === 'Toppings' ? 'Ingredientes' : option.name}
                                </Label>
                            </div>
                            {option.price > 0 && (
                                <span className="text-xs text-gray-400">+{formatCurrency(option.price)}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Construct image URL the same way Menu component does
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/(v1|api)$/, '');
    const imageSrc = item.imageUrl && apiUrl
        ? `${apiUrl}${item.imageUrl}` // API provides the full relative path like /images/coke.jpg
        : '/burger.png'; // Use fallback from frontend/public
    const fallbackSrc = '/burger.png'; // Define fallback for error handling

    // --- Main Content Structure ---
    const content = (
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 min-h-0">
            {/* Image Column (Adjusted width slightly for better balance) */}
            <div className="md:w-2/5 h-64 relative overflow-hidden rounded-lg bg-gray-800 flex-shrink-0">                {(isImageLoading || imageLoadError) && (
                <Skeleton className="absolute inset-0 w-full h-full bg-gray-700" />
            )}
                {!imageLoadError && (
                    <Image
                        src={imageSrc}
                        alt={item.name}
                        fill
                        className={`object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                        sizes="(max-width: 768px) 90vw, 40vw"
                        onError={(e) => {
                            console.error(`ItemCustomization: Error loading image ${imageSrc}`);
                            (e.target as HTMLImageElement).src = fallbackSrc;
                            (e.target as HTMLImageElement).srcset = fallbackSrc;
                            handleImageError();
                        }}
                        onLoad={() => setIsImageLoading(false)}
                        priority
                    />
                )}
            </div>

            {/* Details & Customization Column - Flex column structure */}
            <div className="md:w-3/5 flex flex-col flex-1 min-h-0"> {/* Ensure this column can shrink and grow */}
                {/* Item Header */}
                <div className="mb-4 flex-shrink-0">
                    <h3 className="text-2xl font-bold text-white">{item.name}</h3>
                </div>

                {/* Item Info */}
                <p className="text-gray-400 mb-4 text-sm">Precio base: {formatCurrency(item.price)}</p>
                <p className="text-gray-300 mb-5 break-words">{item.description}</p>

                {/* Customization Section - Allow this part to grow */}
                {/* This inner div handles the scrolling for customization options if they overflow */}
                {/* REMOVED overflow-y-auto FROM HERE for mobile, outer container will scroll */}
                <div className="flex-1 min-h-0 mb-4 pr-1 custom-scrollbar">
                    {item.category === 'BURGER' ? (
                        isLoadingCustomizations ? (
                            <div className="space-y-4 mt-4">
                                <Skeleton className="h-6 w-1/4 bg-gray-700" />
                                <Skeleton className="h-8 w-full bg-gray-700" />
                                <Skeleton className="h-8 w-full bg-gray-700" />
                            </div>
                        ) : customizationError ? (
                            <Alert variant="destructive">
                                <AlertDescription>{customizationError}</AlertDescription>
                            </Alert>
                        ) : (
                            customizationCategories.map((category, index) => (
                                <React.Fragment key={category.id}>
                                    {renderOptions(category)}
                                    {index < customizationCategories.length - 1 && <Separator className="my-4 bg-border" />}
                                </React.Fragment>
                            ))
                        )
                    ) : (
                        <div className="mb-4 p-3 bg-gray-800/50 rounded-md border border-gray-700/50">
                            <p className="text-sm text-gray-400">Personalizaciones disponibles solo para hamburguesas.</p>
                        </div>
                    )}
                </div>

                {/* Quantity & Price - Keep at bottom */}
                <div className="mt-auto flex-shrink-0 pt-4">
                    <Separator className="my-4 bg-gray-700" />
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3 mr-4">
                            <Button variant="outline" size="icon" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1} className="h-9 w-9 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed">
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-lg font-semibold w-10 text-center">{quantity}</span>
                            <Button variant="outline" size="icon" onClick={() => handleQuantityChange(1)} className="h-9 w-9 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button
                            onClick={handleAddToBasketClick}
                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg py-3 disabled:opacity-50"
                            disabled={isLoadingCustomizations}
                        >
                            {isLoadingCustomizations ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                `${formatCurrency(calculateTotalPrice)}`
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isDesktop) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                {/* Desktop Dialog: Fixed max height, flex column */}
                <DialogContent className="sm:max-w-[800px] bg-gray-900 border-gray-700 text-white flex flex-col max-h-[90vh] p-6"> {/* Adjusted padding */}
                    {/* Scrollable Content Area: Takes remaining space, scrolls */}
                    <div className="flex-1 overflow-y-auto min-h-0 -mx-6 -mb-6 px-6 pb-6 custom-scrollbar"> {/* Adjust scroll container padding to account for DialogContent padding */}
                        {content}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // --- Mobile Drawer ---
    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-gray-900 border-gray-700 text-white max-h-[90vh] flex flex-col">
                <DrawerHeader className="text-left text-lg font-semibold flex-shrink-0">Personalizar {item.name}</DrawerHeader>
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto px-4 min-h-0 custom-scrollbar">
                    {content}
                </div>
                {/* Footer kept separate */}
                <DrawerFooter className="pt-2 flex-shrink-0">
                    <Button
                        onClick={handleAddToBasketClick}
                        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg py-3 disabled:opacity-50"
                        disabled={isLoadingCustomizations}
                    >
                        {isLoadingCustomizations ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            `Add ${quantity} to Basket (${formatCurrency(calculateTotalPrice)})`
                        )}
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full border-gray-600 hover:bg-gray-800 text-gray-300">Cancelar</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

// Add some basic custom scrollbar styles (optional)
// You might want to add these to your global CSS instead
const styles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 0, 0.4);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 0, 0.6);
}
`;

if (typeof window !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
} 