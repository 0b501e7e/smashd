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

type Option = { id: number; name: string; price: number; isDefaultSelected?: boolean };
type Customizations = Record<string, Option[]>;

export default function MenuItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToBasket } = useBasket();

  const itemId = params.itemId as string;

  const [item, setItem] = useState<MenuItem | null>(null);
  const [customizations, setCustomizations] = useState<Customizations>({});
  const [selected, setSelected] = useState<Record<string, Set<number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [suggestedItems, setSuggestedItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (!itemId) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [itemRes, customizationsRes, menuRes] = await Promise.all([
          api.get(`/menu/${itemId}`),
          api.get(`/menu/items/${itemId}/customizations`),
          api.get('/menu'),
        ]);

        if (!itemRes.ok) throw new Error(`Failed to fetch item: ${itemRes.statusText}`);

        const itemData: MenuItem = (await itemRes.json()).data;
        setItem(itemData);

        // Load customizations from API and pre-select defaults
        if (customizationsRes.ok) {
          const custData: Customizations = (await customizationsRes.json()).data ?? {};
          setCustomizations(custData);

          // Pre-select options marked as default
          const defaults: Record<string, Set<number>> = {};
          for (const [category, options] of Object.entries(custData)) {
            for (const option of options) {
              if (option.isDefaultSelected) {
                if (!defaults[category]) defaults[category] = new Set();
                defaults[category].add(option.id);
              }
            }
          }
          setSelected(defaults);
        }

        // "Goes well with" suggestions
        if (menuRes.ok) {
          const allItems: MenuItem[] = (await menuRes.json()).data ?? [];
          setSuggestedItems(
            allItems
              .filter(i => i.id !== itemData.id && i.category !== itemData.category)
              .sort(() => Math.random() - 0.5)
              .slice(0, 4)
          );
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load item details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [itemId]);

  const toggleOption = (category: string, optionId: number) => {
    setSelected(prev => {
      const next = { ...prev, [category]: new Set(prev[category] ?? []) };
      if (next[category].has(optionId)) {
        next[category].delete(optionId);
      } else {
        next[category].add(optionId);
      }
      return next;
    });
  };

  const calculateTotalPrice = () => {
    if (!item) return 0;
    let unitPrice = item.price;
    for (const [category, options] of Object.entries(customizations)) {
      for (const option of options) {
        if (selected[category]?.has(option.id) && !option.isDefaultSelected) {
          unitPrice += option.price;
        }
      }
    }
    return unitPrice * quantity;
  };

  const handleAddToCart = () => {
    if (!item) return;
    const unitPrice = calculateTotalPrice() / quantity;
    const custSelection: CustomizationSelection = {};
    const selectedByCategory: Record<string, string[]> = {};

    for (const [category, options] of Object.entries(customizations)) {
      const names = options
        .filter(o => selected[category]?.has(o.id))
        .map(o => o.name);

      const removedDefaults = options
        .filter(o => o.isDefaultSelected && !selected[category]?.has(o.id))
        .map(o => o.name);

      if (names.length > 0) {
        selectedByCategory[category.toLowerCase()] = names;
      }
      if (removedDefaults.length > 0) {
        custSelection.removed = [...(custSelection.removed ?? []), ...removedDefaults];
      }
    }
    if (Object.keys(selectedByCategory).length > 0) custSelection.selected = selectedByCategory;
    if (specialRequests.trim()) custSelection.specialRequests = specialRequests.trim();

    addToBasket({
      menuItemId: item.id,
      name: item.name,
      quantity,
      unitPrice,
      customizations: Object.keys(custSelection).length > 0 ? custSelection : undefined,
      imageUrl: item.imageUrl ?? undefined,
    });

    router.push('/#menu');
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/(v1|api)$/, '');
  const imageSrc = item?.imageUrl
    ? (item.imageUrl.startsWith('http') ? item.imageUrl : (apiUrl ? `${apiUrl}${item.imageUrl}` : item.imageUrl))
    : '/burger.png';

  if (isLoading) return <div className="container mx-auto min-h-screen flex justify-center items-center"><p className="text-yellow-400 text-xl">Loading...</p></div>;
  if (error) return <div className="container mx-auto min-h-screen flex justify-center items-center"><p className="text-red-500 text-xl">Error: {error}</p></div>;
  if (!item) return <div className="container mx-auto min-h-screen flex justify-center items-center"><p className="text-white text-xl">Item not found.</p></div>;

  return (
    <div className="container mx-auto px-4 py-8 pt-20 min-h-screen bg-black text-white">
      <Card className="bg-yellow-950 border border-yellow-400/30 overflow-hidden">
        <div className="md:flex">
          {/* Image */}
          <div className="md:w-1/2">
            <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-lg bg-gray-800">
              <Image
                src={imageSrc}
                alt={item.name}
                fill
                style={{ objectFit: 'cover' }}
                priority
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/burger.png';
                  (e.target as HTMLImageElement).srcset = '/burger.png';
                }}
              />
            </div>
          </div>

          {/* Details & Customization */}
          <div className="md:w-1/2 p-6 flex flex-col">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-3xl font-bold text-yellow-400 mb-2">{item.name}</CardTitle>
              <CardDescription className="text-gray-300 text-base">{item.description}</CardDescription>
              <p className="text-xl font-semibold mt-2 text-white">Base Price: €{item.price.toFixed(2)}</p>
            </CardHeader>

            <Separator className="my-4 bg-yellow-400/30" />

            <CardContent className="p-0 flex-grow overflow-y-auto">
              {/* Dynamic customization categories from API */}
              {Object.entries(customizations).map(([category, options]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-300">{category}</h3>
                  <div className="space-y-2">
                    {options.map(option => (
                      <div key={option.id} className="flex items-center justify-between">
                        <Label htmlFor={`${category}-${option.id}`} className="flex items-center space-x-2 cursor-pointer text-white">
                          <Checkbox
                            id={`${category}-${option.id}`}
                            checked={selected[category]?.has(option.id) ?? false}
                            onCheckedChange={() => toggleOption(category, option.id)}
                            className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black"
                          />
                          <span>
                            {option.name}
                            {option.isDefaultSelected && (
                              <span className="ml-2 rounded bg-yellow-500/10 px-1.5 py-0.5 text-xs italic text-yellow-300">
                                Included
                              </span>
                            )}
                          </span>
                        </Label>
                        {option.price > 0 && !option.isDefaultSelected && (
                          <span className="text-sm text-yellow-200">+€{option.price.toFixed(2)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Special Requests */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-yellow-300">Special Requests</h3>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="E.g. No onions, well done..."
                  rows={3}
                  className="w-full bg-black/50 border border-yellow-400/30 rounded-md p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none"
                />
              </div>
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

      {/* Goes Well With */}
      {suggestedItems.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Goes Well With</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {suggestedItems.map((suggested) => {
              const suggestedImageSrc = suggested.imageUrl
                ? (suggested.imageUrl.startsWith('http') ? suggested.imageUrl : (apiUrl ? `${apiUrl}${suggested.imageUrl}` : suggested.imageUrl))
                : '/burger.png';
              return (
                <Card
                  key={suggested.id}
                  className="bg-black/50 border border-yellow-600/30 hover:border-yellow-500/50 transition-all cursor-pointer hover:scale-[1.02]"
                  onClick={() => router.push(`/menu/${suggested.id}`)}
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-gray-800">
                    <Image
                      src={suggestedImageSrc}
                      alt={suggested.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 45vw, 23vw"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/burger.png'; }}
                    />
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-white truncate">{suggested.name}</p>
                    <p className="text-sm text-yellow-400">€{suggested.price.toFixed(2)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
