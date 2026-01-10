'use client'

import { useBasket, MenuItem, BasketItem } from './BasketContext';
import { motion, useInView } from 'framer-motion';
import { Plus, ArrowRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from '@/lib/utils';
import { ItemCustomization } from './ItemCustomization';
import { useMenu } from '@/hooks/useMenu';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Menu() {
    const { menuItems, isLoading, error } = useMenu();
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.05 });
    const [imageErrorMap, setImageErrorMap] = useState<{ [key: number]: boolean }>({});

    const handleCardClick = (item: MenuItem) => {
        setSelectedItem(item);
        setIsCustomizationOpen(true);
    };

    const handleImageError = (itemId: number) => {
        setImageErrorMap(prev => ({ ...prev, [itemId]: true }));
    };

    const categoryOrder: { [key: string]: number } = { 'BURGER': 1, 'SIDE': 2, 'DRINK': 3 };
    const sortedCategories = Object.keys(menuItems).sort((a, b) => {
        const orderA = categoryOrder[a] ?? 99;
        const orderB = categoryOrder[b] ?? 99;
        return orderA - orderB;
    });

    return (
        <section id="menu" ref={sectionRef} className="w-full py-16 md:py-24 bg-black text-white scroll-mt-16">
            <div className="container mx-auto px-4 md:px-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-10 md:mb-16 text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
                        Explora Nuestro Menú
                    </h2>
                </motion.div>

                {isLoading && (
                    <div className="space-y-12 md:space-y-16 animate-pulse">
                        {[...Array(2)].map((_, catIndex) => (
                            <div key={`skel-cat-${catIndex}`}>
                                <Skeleton className="h-8 w-1/4 mb-6 md:mb-8 bg-gray-800" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                    {[...Array(4)].map((_, itemIndex) => (
                                        <Card key={`skel-item-${catIndex}-${itemIndex}`} className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
                                            <Skeleton className="aspect-video w-full bg-gray-800" />
                                            <CardContent className="p-4 flex flex-col flex-grow">
                                                <Skeleton className="h-5 w-3/4 mb-2 bg-gray-700" />
                                                <Skeleton className="h-4 w-full mb-4 bg-gray-700" />
                                                <Skeleton className="h-4 w-1/2 mb-4 bg-gray-700" />
                                                <div className="flex justify-between items-center mt-auto pt-2">
                                                    <Skeleton className="h-6 w-1/4 bg-gray-700" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {catIndex < 1 && (
                                    <Skeleton className="h-px w-full my-12 md:my-16 bg-border" />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {error && !isLoading && (
                    <div className="flex justify-center items-center min-h-[30vh]">
                        <Alert variant="destructive" className="max-w-lg">
                            <AlertTitle>Error al cargar el Menú</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="space-y-12 md:space-y-16">
                        {sortedCategories.length === 0 ? (
                            <p className="text-center text-gray-400 py-10 text-lg">El menú está vacío actualmente.</p>
                        ) : (
                            sortedCategories.map((category, catIndex) => (
                                <motion.div
                                    key={category}
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.5, delay: catIndex * 0.1 }}
                                >
                                    <h3 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-yellow-400 capitalize border-l-4 border-yellow-400 pl-4">
                                        {category.toLowerCase()}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                        {(menuItems[category] || []).map((item, itemIndex) => {
                                            // Get API base URL, remove trailing /v1 or /api suffix
                                            // Get API base URL, remove trailing /v1 or /api suffix
                                            const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/(v1|api)$/, '');
                                            // Construct full image URL: Check if absolute, else prepend base URL
                                            const imageSrc = item.imageUrl
                                                ? (item.imageUrl.startsWith('http') ? item.imageUrl : (apiUrl ? `${apiUrl}${item.imageUrl}` : item.imageUrl))
                                                : '/burger.png'; // Use fallback
                                            console.log(`Menu Item: Rendering image for ${item.name}: src=${imageSrc}`);

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                                                    transition={{ duration: 0.3, delay: itemIndex * 0.05 + catIndex * 0.1 }}
                                                >
                                                    <Card
                                                        className="relative group overflow-hidden rounded-lg bg-black/50 shadow-md border border-yellow-600/30 hover:border-yellow-500/50 transition-all duration-300 flex flex-col h-full cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                                                        onClick={() => handleCardClick(item)}
                                                    >
                                                        <CardHeader className="p-0">
                                                            <div className="aspect-video relative w-full overflow-hidden bg-gray-800">
                                                                {imageErrorMap[item.id] ? (
                                                                    <Skeleton className="w-full h-full bg-gray-700" />
                                                                ) : (
                                                                    <Image
                                                                        src={imageSrc}
                                                                        alt={item.name}
                                                                        fill
                                                                        style={{ objectFit: 'cover' }}
                                                                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, (max-width: 1280px) 30vw, 23vw"
                                                                        className="transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                                        onError={() => {
                                                                            console.error(`Menu Item: Error loading image for ${item.name}: ${imageSrc}`);
                                                                            handleImageError(item.id);
                                                                        }}
                                                                        priority={itemIndex < 4 && catIndex === 0}
                                                                    />
                                                                )}
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="p-4 flex flex-col flex-grow">
                                                            <CardTitle className="text-lg font-semibold text-yellow-300 mb-1 group-hover:text-yellow-400 transition-colors">
                                                                {item.name}
                                                            </CardTitle>
                                                            <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-grow">
                                                                {item.description}
                                                            </p>
                                                            <div className="flex justify-between items-center mt-auto pt-2">
                                                                <span className="text-xl font-bold text-white">
                                                                    {formatCurrency(item.price)}
                                                                </span>
                                                                <div className="text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                    <ArrowRight className="h-5 w-5" />
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                    {catIndex < sortedCategories.length - 1 && (
                                        <Separator className="my-12 md:my-16 bg-border" />
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                )}
            </div>
            <ItemCustomization
                item={selectedItem}
                isOpen={isCustomizationOpen}
                onOpenChange={setIsCustomizationOpen}
            />
        </section>
    );
}
