'use client'

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { MenuItem, BasketItem, useBasket, CustomizationSelection } from './BasketContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogClose } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Plus, Minus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from "@/components/ui/skeleton";

// --- Customization Data --- (from React Native app)
type CustomizationOption = {
  id: string;
  name: string;
  price: number;
};

const EXTRAS: CustomizationOption[] = [
  { id: 'extra-patty-1', name: 'Extra Patty', price: 2.00 },
  { id: 'cheese-1', name: 'Cheese', price: 1.00 },
  { id: 'bacon-1', name: 'Bacon', price: 1.50 },
  { id: 'avocado-1', name: 'Avocado', price: 1.75 },
];

const SAUCES: CustomizationOption[] = [
  { id: 'ketchup-1', name: 'Ketchup', price: 0 },
  { id: 'mayo-1', name: 'Mayo', price: 0 },
  { id: 'bbq-1', name: 'BBQ Sauce', price: 0 },
  { id: 'special-sauce-1', name: 'Special Sauce', price: 0.50 },
];

const TOPPINGS: CustomizationOption[] = [
  { id: 'lettuce-1', name: 'Lettuce', price: 0 },
  { id: 'tomato-1', name: 'Tomato', price: 0 },
  { id: 'onion-1', name: 'Onion', price: 0 },
  { id: 'pickles-1', name: 'Pickles', price: 0 },
  { id: 'jalapenos-1', name: 'Jalapenos', price: 0.75 },
];

const DEFAULT_SAUCES = ['ketchup-1', 'mayo-1'];
const DEFAULT_TOPPINGS = ['lettuce-1', 'tomato-1', 'onion-1'];
// --- End Customization Data ---

interface ItemCustomizationProps {
    item: MenuItem | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ItemCustomization({ item, isOpen, onOpenChange }: ItemCustomizationProps) {
    const { addToBasket } = useBasket();
    const [quantity, setQuantity] = useState(1);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    // State for selected customization IDs
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [selectedSauces, setSelectedSauces] = useState<string[]>(DEFAULT_SAUCES);
    const [selectedToppings, setSelectedToppings] = useState<string[]>(DEFAULT_TOPPINGS);
    // State for image loading
    const [isImageLoading, setIsImageLoading] = useState(true);
    // State for image load error
    const [imageLoadError, setImageLoadError] = useState(false);

    // Reset state when item changes or modal/drawer closes
    useEffect(() => {
        if (isOpen && item) {
            setQuantity(1);
            setIsImageLoading(true); // Reset loading state
            setImageLoadError(false); // Reset error state
            // Reset selections to defaults only if it's a burger
            if (item.category === 'BURGER') {
                setSelectedExtras([]);
                setSelectedSauces(DEFAULT_SAUCES);
                setSelectedToppings(DEFAULT_TOPPINGS);
            } else {
                // Clear selections for non-burger items
                setSelectedExtras([]);
                setSelectedSauces([]);
                setSelectedToppings([]);
            }
        } else if (!isOpen) {
             // Optionally clear selections when closed, or keep them?
             // Let's clear for now to ensure fresh state on reopen
             setSelectedExtras([]);
             setSelectedSauces(DEFAULT_SAUCES); // Reset to default for next potential burger
             setSelectedToppings(DEFAULT_TOPPINGS);
        }
    }, [isOpen, item]);

    const calculateTotalPrice = useMemo(() => {
        if (!item) return 0;

        let customizationCost = 0;

        selectedExtras.forEach(id => {
            customizationCost += EXTRAS.find(o => o.id === id)?.price || 0;
        });
        selectedSauces.forEach(id => {
            customizationCost += SAUCES.find(o => o.id === id)?.price || 0;
        });
        selectedToppings.forEach(id => {
            customizationCost += TOPPINGS.find(o => o.id === id)?.price || 0;
        });

        const totalItemPrice = item.price + customizationCost;
        return totalItemPrice * quantity;

    }, [item, quantity, selectedExtras, selectedSauces, selectedToppings]);

    if (!item) return null;

    const handleQuantityChange = (amount: number) => {
        setQuantity(prev => Math.max(1, prev + amount));
    };

    const toggleSelection = (id: string, currentSelected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
        setSelected(prevSelected =>
            prevSelected.includes(id)
                ? prevSelected.filter(item => item !== id)
                : [...prevSelected, id]
        );
        // Optional: Add Haptic feedback if possible/desired in web
    };

    const handleAddToBasketClick = () => {
        if (!item) return;

        // Map selected IDs to names for the basket context
        const getNamesByIds = (ids: string[], options: CustomizationOption[]): string[] => {
            return ids.map(id => options.find(o => o.id === id)?.name).filter(Boolean) as string[];
        };

        const customizations: CustomizationSelection = {
            extras: getNamesByIds(selectedExtras, EXTRAS),
            sauces: getNamesByIds(selectedSauces, SAUCES),
            toppings: getNamesByIds(selectedToppings, TOPPINGS),
        };

        // Calculate unit price (total price / quantity)
        const unitPriceWithCustomizations = calculateTotalPrice / quantity;

        const itemToAdd: Omit<BasketItem, 'cartItemId'> = {
            menuItemId: item.id,
            name: item.name,
            quantity: quantity,
            unitPrice: unitPriceWithCustomizations, // Use calculated price per unit
            imageUrl: item.imageUrl,
            customizations: item.category === 'BURGER' ? customizations : undefined, // Only add customizations for burgers
        };
        addToBasket(itemToAdd);
        onOpenChange(false); // Close modal/drawer after adding
    };

    // Helper to render customization options
    const renderOptions = (
        title: string,
        options: CustomizationOption[],
        selected: string[],
        setSelected: React.Dispatch<React.SetStateAction<string[]>>
    ) => (
        <div className="mb-4">
            <h4 className="font-semibold mb-3 text-lg text-yellow-300">{title}</h4>
            <div className="space-y-2">
                {options.map(option => (
                    <div key={option.id} className="flex items-center justify-between space-x-2 p-2 rounded hover:bg-gray-800/60">
                       <div className="flex items-center space-x-2">
                            <Checkbox
                                id={option.id}
                                checked={selected.includes(option.id)}
                                onCheckedChange={() => toggleSelection(option.id, selected, setSelected)}
                                className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black"
                            />
                            <Label htmlFor={option.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                {option.name}
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

    const handleImageError = () => {
        setIsImageLoading(false); // Ensure loading stops
        setImageLoadError(true); // Set error state
    };

    const content = (
        <div className="flex flex-col md:flex-row gap-6 p-4 md:p-0">
            {/* Image Column with Skeleton for loading AND error */}
            <div className="md:w-1/3 lg:w-1/2 relative aspect-square md:aspect-auto overflow-hidden rounded-lg bg-gray-800 flex-shrink-0">
                {/* Skeleton shown for loading OR error */}
                {(isImageLoading || imageLoadError) && (
                    <Skeleton className="absolute inset-0 w-full h-full bg-gray-700" />
                )}
                {/* Image rendered only if no error */}
                {!imageLoadError && (
                    <Image
                         src={item.imageUrl || ''} // Use empty string if no URL
                         alt={item.name}
                         fill
                         style={{ objectFit: 'cover' }}
                         sizes="(max-width: 768px) 90vw, 50vw"
                         className={`transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                         onError={handleImageError}
                         onLoad={() => setIsImageLoading(false)}
                         priority
                     />
                )}
            </div>

            {/* Details & Customization Column */}
            <div className="md:w-2/3 lg:w-1/2 flex flex-col min-h-0"> {/* Removed overflow-y-auto, custom-scrollbar, pr-2 */}
                {/* Content directly inside the column */}
                <div className=""> {/* Removed overflow-y-auto, custom-scrollbar, pr-2, flex-grow */}
                    <h3 className="text-2xl font-bold mb-1 text-yellow-400">{item.name}</h3>
                    <p className="text-gray-400 mb-4 text-sm">Base price: {formatCurrency(item.price)}</p>
                    <p className="text-gray-300 mb-5">{item.description}</p>

                    {item.category === 'BURGER' && (
                        <>
                            {renderOptions('Extras', EXTRAS, selectedExtras, setSelectedExtras)}
                            <Separator className="my-4 bg-border" />
                            {renderOptions('Sauces', SAUCES, selectedSauces, setSelectedSauces)}
                            <Separator className="my-4 bg-border" />
                            {renderOptions('Toppings', TOPPINGS, selectedToppings, setSelectedToppings)}
                        </>
                    )}
                     {item.category !== 'BURGER' && (
                        <div className="mb-4 p-3 bg-gray-800/50 rounded-md border border-gray-700/50">
                            <p className="text-sm text-gray-400">Customizations available for burgers only.</p>
                        </div>
                     )}
                </div>

                 {/* Footer Controls (Quantity & Add Button) - Placed outside scroll */}
                 <div className="flex items-center justify-between mt-5 pt-4 border-t border-border space-x-4 flex-shrink-0">
                     <div className="flex items-center gap-2">
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
                        className="flex-grow bg-yellow-400 text-black hover:bg-yellow-500 transition-colors text-sm font-semibold h-9 px-4"
                        disabled={!item} // Disable if somehow no item
                    >
                        Add {quantity} to Basket ({formatCurrency(calculateTotalPrice)})
                     </Button>
                 </div>
            </div>
        </div>
    );

    if (isDesktop) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                {/* Adjusted max width for customization content - Reduced width */}
                <DialogContent className="sm:max-w-3xl max-h-[80vh] bg-gray-900 border-yellow-400/30 text-white p-0 flex flex-col">
                    <DialogHeader className="p-6 pb-0 sr-only">
                        {/* Screen reader title */}
                        <span id="dialogTitle">Customize {item?.name}</span>
                    </DialogHeader>
                    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
                         <X className="h-5 w-5 text-gray-400 hover:text-white" />
                         <span className="sr-only">Close</span>
                     </DialogClose>
                    {/* Make this wrapper the scroll container */}
                    <div className="p-6 pt-6 overflow-y-auto custom-scrollbar" aria-labelledby="dialogTitle"> {/* Removed flex-grow, added overflow-y-auto and scrollbar class */}
                        {content}
                    </div>
                    {/* Dialog Footer removed as button is inline */}
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile: Use Drawer
    return (
         <Drawer open={isOpen} onOpenChange={onOpenChange}>
             {/* Ensure max-h is applied here - Reduced height slightly */}
             <DrawerContent className="bg-gray-900 border-t border-yellow-400/30 text-white max-h-[85vh]">
                {/* Ensure flex structure allows inner scrolling */}
                <div className="mx-auto w-full max-w-md flex flex-col h-full">
                 <DrawerHeader className="text-left pt-4 pb-2 flex-shrink-0 sr-only">
                     <span id="drawerTitle">Customize {item?.name}</span>
                 </DrawerHeader>
                 {/* This div should handle the scrolling within the drawer's max-h */}
                 <div className="overflow-y-auto flex-grow custom-scrollbar" aria-labelledby="drawerTitle">
                    {content} {/* Reuse the same content structure */}
                 </div>
                 {/* Drawer Footer can be simplified or removed if button is in content */}
                 <DrawerFooter className="pt-2 mt-auto flex-shrink-0 sr-only">
                   <DrawerClose asChild>
                     <Button variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white">Close</Button>
                   </DrawerClose>
                 </DrawerFooter>
                </div>
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