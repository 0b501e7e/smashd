'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useBasket, MenuItem, CustomizationSelection } from '@/app/components/BasketContext';
import { Minus, Plus } from 'lucide-react';
import { api } from '@/lib/api';

// Define customization options (similar to React Native app)
// In a real app, these might come from an API or config
const CUSTOMIZATION_CONFIG = {
  BURGER: {
    EXTRAS: [
      { id: 'extra-patty', name: 'Extra Patty', price: 2.00 },
      { id: 'cheese', name: 'Cheese', price: 1.00 },
      { id: 'bacon', name: 'Bacon', price: 1.50 },
      { id: 'avocado', name: 'Avocado', price: 1.75 },
    ],
    SAUCES: [
      { id: 'ketchup', name: 'Ketchup', price: 0 },
      { id: 'mayo', name: 'Mayo', price: 0 },
      { id: 'bbq', name: 'BBQ Sauce', price: 0 },
      { id: 'special-sauce', name: 'Special Sauce', price: 0.50 },
    ],
    TOPPINGS: [
      { id: 'lettuce', name: 'Lettuce', price: 0 },
      { id: 'tomato', name: 'Tomato', price: 0 },
      { id: 'onion', name: 'Onion', price: 0 },
      { id: 'pickles', name: 'Pickles', price: 0 },
      { id: 'jalapenos', name: 'Jalapenos', price: 0.75 },
    ],
  },
  // Add configurations for SIDE, DRINK etc. if they have customizations
  SIDE: {},
  DRINK: {},
};

type Option = { id: string; name: string; price: number };
type CategoryConfig = { EXTRAS?: Option[]; SAUCES?: Option[]; TOPPINGS?: Option[] };

export default function MenuItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToBasket } = useBasket();

  const itemId = params.itemId as string;

  const [item, setItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // State for selected customizations
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  // Fetch item details
  useEffect(() => {
    if (!itemId) return;
    const fetchItem = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/menu/${itemId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch item: ${response.statusText}`);
        }
        const responseData = await response.json();
        // Handle new API response structure
        const data: MenuItem = responseData.data || responseData;
        setItem(data);

        // Set default selections based on item type if needed
        // Example: Pre-select standard toppings for a burger
        if (data.category === 'BURGER') {
          // Example: Default sauces/toppings could be set here
          // setSelectedSauces(['ketchup', 'mayo']);
          // setSelectedToppings(['lettuce', 'tomato', 'onion']);
        }

      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load item details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchItem();
  }, [itemId]);

  // Get customization config for the current item type
  const categoryConfig = item?.category ? (CUSTOMIZATION_CONFIG as any)[item.category] as CategoryConfig : {};

  // Function to calculate total price
  const calculateTotalPrice = () => {
    if (!item) return 0;
    let unitPrice = item.price;

    const calculateCategoryPrice = (selectedIds: string[], options?: Option[]) => {
      return selectedIds.reduce((sum, id) => {
        const option = options?.find(opt => opt.id === id);
        return sum + (option?.price || 0);
      }, 0);
    };

    unitPrice += calculateCategoryPrice(selectedExtras, categoryConfig.EXTRAS);
    unitPrice += calculateCategoryPrice(selectedSauces, categoryConfig.SAUCES);
    unitPrice += calculateCategoryPrice(selectedToppings, categoryConfig.TOPPINGS);

    return unitPrice * quantity;
  };

  // Toggle customization selection
  const handleSelectionChange = (id: string, category: 'EXTRAS' | 'SAUCES' | 'TOPPINGS') => {
    const setters = {
      EXTRAS: setSelectedExtras,
      SAUCES: setSelectedSauces,
      TOPPINGS: setSelectedToppings,
    };
    const currentSelection = { // Correctly reference state variables
      EXTRAS: selectedExtras,
      SAUCES: selectedSauces,
      TOPPINGS: selectedToppings,
    }[category];

    const setter = setters[category];
    if (currentSelection.includes(id)) {
      setter(currentSelection.filter(selId => selId !== id));
    } else {
      setter([...currentSelection, id]);
    }
  };

  // Add item to basket
  const handleAddToCart = () => {
    if (!item) return;

    const unitPrice = calculateTotalPrice() / quantity;
    const customizations: CustomizationSelection = {};

    const mapSelections = (selectedIds: string[], options?: Option[]) => {
      return selectedIds
        .map(id => options?.find(opt => opt.id === id)?.name)
        .filter((name): name is string => !!name);
    }

    if (selectedExtras.length > 0) customizations.extras = mapSelections(selectedExtras, categoryConfig.EXTRAS);
    if (selectedSauces.length > 0) customizations.sauces = mapSelections(selectedSauces, categoryConfig.SAUCES);
    if (selectedToppings.length > 0) customizations.toppings = mapSelections(selectedToppings, categoryConfig.TOPPINGS);

    addToBasket({
      menuItemId: item.id,
      name: item.name,
      quantity: quantity,
      unitPrice: unitPrice,
      customizations: Object.keys(customizations).length > 0 ? customizations : undefined,
      imageUrl: item.imageUrl,
    });

    // Optionally: show confirmation and/or navigate away
    router.push('/#menu'); // Navigate back to menu section on homepage for now
  };

  // Helper to render customization options
  const renderOptions = (title: string, options: Option[] | undefined, selected: string[], category: 'EXTRAS' | 'SAUCES' | 'TOPPINGS') => {
    if (!options || options.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-yellow-300">{title}</h3>
        <div className="space-y-2">
          {options.map(option => (
            <div key={option.id} className="flex items-center justify-between">
              <Label htmlFor={`${category}-${option.id}`} className="flex items-center space-x-2 cursor-pointer text-white">
                <Checkbox
                  id={`${category}-${option.id}`}
                  checked={selected.includes(option.id)}
                  onCheckedChange={() => handleSelectionChange(option.id, category)}
                  className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black"
                />
                <span>{option.name}</span>
              </Label>
              {option.price > 0 && (
                <span className="text-sm text-yellow-200">+€{option.price.toFixed(2)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };


  if (isLoading) return <div className="container mx-auto min-h-screen flex justify-center items-center"><p className="text-yellow-400 text-xl">Loading...</p></div>;
  if (error) return <div className="container mx-auto min-h-screen flex justify-center items-center"><p className="text-red-500 text-xl">Error: {error}</p></div>;
  if (!item) return <div className="container mx-auto min-h-screen flex justify-center items-center"><p className="text-white text-xl">Item not found.</p></div>;

  // Get API base URL, remove trailing /v1 or /api suffix
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/(v1|api)$/, '');
  // Construct full image URL: <base_url><api_path> (e.g. http://.../images/coke.jpg)
  const imageSrc = item.imageUrl && apiUrl
    ? `${apiUrl}${item.imageUrl}` // API provides the full relative path like /images/coke.jpg
    : '/burger.png'; // Keep using frontend fallback
  const fallbackSrc = '/burger.png'; // Define fallback for error handling
  console.log(`Detail Page: Using image path: ${imageSrc}`);

  return (
    <div className="container mx-auto px-4 py-8 pt-20 min-h-screen bg-black text-white">
      <Card className="bg-yellow-950 border border-yellow-400/30 overflow-hidden">
        <div className="md:flex">
          {/* Image Section */}
          <div className="md:w-1/2">
            <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-lg bg-gray-800">
              <Image
                src={imageSrc}
                alt={item.name}
                fill
                style={{ objectFit: 'cover' }}
                priority // Prioritize loading the main image on the detail page
                onError={(e) => {
                  console.error(`Detail Page: Error loading image ${imageSrc}`);
                  (e.target as HTMLImageElement).src = fallbackSrc;
                  (e.target as HTMLImageElement).srcset = fallbackSrc;
                }}
              />
            </div>
          </div>

          {/* Details & Customization Section */}
          <div className="md:w-1/2 p-6 flex flex-col">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-3xl font-bold text-yellow-400 mb-2">{item.name}</CardTitle>
              <CardDescription className="text-gray-300 text-base">{item.description}</CardDescription>
              <p className="text-xl font-semibold mt-2 text-white">Base Price: €{item.price.toFixed(2)}</p>
            </CardHeader>

            <Separator className="my-4 bg-yellow-400/30" />

            <CardContent className="p-0 flex-grow overflow-y-auto">
              {/* Customizations */}
              {renderOptions('Extras', categoryConfig.EXTRAS, selectedExtras, 'EXTRAS')}
              {renderOptions('Sauces', categoryConfig.SAUCES, selectedSauces, 'SAUCES')}
              {renderOptions('Toppings', categoryConfig.TOPPINGS, selectedToppings, 'TOPPINGS')}

              {/* Spacer if no customizations */} \n                {Object.keys(categoryConfig).length === 0 && <div className="h-16"></div>}
            </CardContent>

            <Separator className="my-4 bg-yellow-400/30" />

            {/* Quantity & Add to Cart */}
            <div className="mt-auto">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold text-yellow-300">Quantity</Label>
                <div className="flex items-center border border-yellow-400/50 rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="text-yellow-400 hover:bg-yellow-800/50 disabled:text-gray-500"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <span className="w-12 text-center text-lg font-medium text-white">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(q => q + 1)}
                    className="text-yellow-400 hover:bg-yellow-800/50"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full bg-yellow-400 text-black hover:bg-yellow-500 text-lg font-bold py-3"
                onClick={handleAddToCart}
              >
                Add {quantity} to Cart - €{calculateTotalPrice().toFixed(2)}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 