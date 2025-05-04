'use client'

import { useBasket, BasketItem } from './BasketContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // Assuming you have a currency formatter

// Helper to render customizations cleanly
const renderCustomizations = (item: BasketItem) => {
  if (!item.customizations || Object.keys(item.customizations).length === 0) {
    return null;
  }

  const { extras = [], sauces = [], toppings = [] } = item.customizations;
  const allCustomizations = [
    ...(extras.length > 0 ? [`Extras: ${extras.join(', ')}`] : []),
    ...(sauces.length > 0 ? [`Sauces: ${sauces.join(', ')}`] : []),
    ...(toppings.length > 0 ? [`Toppings: ${toppings.join(', ')}`] : []),
  ];

  if (allCustomizations.length === 0) return null;

  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      {allCustomizations.join('; ')}
    </p>
  );
};


export function BasketButton() {
  const { basket, removeFromBasket, updateQuantity, getTotalPrice, getTotalItems } = useBasket();
  const router = useRouter();
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const handleCheckout = () => {
    router.push('/checkout');
    // The SheetClose will handle closing the sheet
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full bg-yellow-400 text-black hover:bg-yellow-500 focus:ring-yellow-300">
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {totalItems}
            </span>
          )}
          <span className="sr-only">Open basket</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col bg-white dark:bg-gray-900 text-black dark:text-white w-[90vw] sm:w-[400px] sm:max-w-lg">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-lg font-semibold text-yellow-500 dark:text-yellow-400">Your Cart</SheetTitle>
        </SheetHeader>
        <Separator className="bg-gray-200 dark:bg-gray-700" />

        {basket.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <ShoppingBag className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-center text-gray-500 dark:text-gray-400">Your cart is empty.</p>
            <SheetClose asChild>
               <Button variant="link" className="mt-4 text-yellow-600 dark:text-yellow-400">Continue Shopping</Button>
            </SheetClose>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6 py-4">
              <ul className="space-y-4">
                {basket.map((item) => {
                  // Get API base URL, remove trailing /v1 or /api suffix
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/(v1|api)$/, '');
                  // Construct full image URL: <base_url><api_path> (e.g. http://.../images/coke.jpg)
                  const imageSrc = item.imageUrl && apiUrl 
                                    ? `${apiUrl}${item.imageUrl}` // API provides the full relative path like /images/coke.jpg
                                    : '/burger.png'; // Keep using frontend fallback
                  const fallbackSrc = '/burger.png';
                  console.log(`Basket Item: Using image path: ${imageSrc}`);

                  return (
                    <li key={item.cartItemId} className="flex items-start space-x-4 py-4">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                        <Image
                          src={imageSrc}
                          alt={item.name}
                          fill
                          sizes="(max-width: 768px) 10vw, 5vw"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            console.error(`Basket Item: Error loading image ${imageSrc}`);
                            (e.target as HTMLImageElement).src = fallbackSrc;
                            (e.target as HTMLImageElement).srcset = fallbackSrc;
                          }}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                             <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</h3>
                             {renderCustomizations(item)}
                          </div>
                          <span className="ml-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                             {formatCurrency(item.unitPrice * item.quantity)}
                          </span>
                        </div>

                         <div className="flex items-center justify-between mt-2">
                             {/* Quantity Controls */}
                             <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                                 <Button
                                     variant="ghost"
                                     size="icon"
                                     className="h-7 w-7 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                     onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                     disabled={item.quantity <= 1}
                                  >
                                     <Minus className="h-4 w-4" />
                                 </Button>
                                 <span className="w-8 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                                     {item.quantity}
                                 </span>
                                 <Button
                                     variant="ghost"
                                     size="icon"
                                     className="h-7 w-7 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                     onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                 >
                                     <Plus className="h-4 w-4" />
                                 </Button>
                             </div>

                             {/* Remove Button */}
                             <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
                                onClick={() => removeFromBasket(item.cartItemId)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove item</span>
                             </Button>
                         </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>

            <Separator className="bg-gray-200 dark:bg-gray-700" />

            <SheetFooter className="px-6 py-4 mt-auto">
              <div className="w-full space-y-3">
                <div className="flex justify-between text-base font-medium text-gray-900 dark:text-gray-100">
                  <p>Subtotal</p>
                  <p>{formatCurrency(totalPrice)}</p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Shipping and taxes calculated at checkout.</p>
                <SheetClose asChild>
                   <Button
                      size="lg"
                      className="w-full bg-yellow-400 text-black hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                      onClick={handleCheckout}
                      disabled={basket.length === 0}
                   >
                     Checkout
                   </Button>
                </SheetClose>
                 <SheetClose asChild>
                    <Button variant="link" className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-300">
                       or Continue Shopping <span aria-hidden="true"> &rarr;</span>
                    </Button>
                 </SheetClose>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}