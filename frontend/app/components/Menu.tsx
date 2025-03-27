'use client'

import { useBasket, MenuItem } from './BasketContext';
import { motion, useInView } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/app/components/button"
import { Card, CardHeader, CardContent, CardTitle } from "@/app/components/card"

export function Menu() {
  const { basket, addToBasket } = useBasket();
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  useEffect(() => {
    fetchMenuItems()
  }, [])

  const fetchMenuItems = async () => {
    try {
      // Remove any trailing slash from the API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.endsWith('/') 
        ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) 
        : process.env.NEXT_PUBLIC_API_URL;
        
      console.log('Fetching menu from:', `${apiUrl}/v1/menu`);
      const response = await fetch(`${apiUrl}/v1/menu`);
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: MenuItem[] = await response.json();
      console.log('Menu data received:', data);

      // Remove duplicates and group items by category
      const groupedItems = data.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        if (!acc[item.category].some(existingItem => existingItem.name === item.name)) {
          acc[item.category].push(item);
        }
        return acc;
      }, {} as Record<string, MenuItem[]>);

      setMenuItems(groupedItems);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching menu items:', err);
      setError('Failed to load menu items. Please try again later.');
      setIsLoading(false);
    }
  };

  const handleAddToBasket = (item: MenuItem) => {
    addToBasket(item);
    setClickedItem(item.name);
    setTimeout(() => setClickedItem(null), 500);
  };

  const renderMenuItems = (category: string, items: MenuItem[]) => {
    if (isLoading) {
      return (
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-yellow-900/50 rounded-lg mb-4"></div>
          ))}
        </div>
      );
    }

    return (
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex justify-between items-center cursor-pointer ${
              clickedItem === item.name ? 'bg-yellow-900' : ''
            } hover:bg-yellow-900/50 transition duration-300 p-2 rounded-lg`}
          >
            <div className="flex items-center">
              <Image src={item.imageUrl || '/placeholder.jpg'} alt={item.name} width={64} height={64} className="object-cover rounded mr-4" />
              <span className="text-yellow-400">{item.name}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2 text-lg font-semibold text-yellow-400">€{item.price.toFixed(2)}</span>
              <Button
                onClick={() => handleAddToBasket(item)}
                size="icon"
                className="bg-yellow-400 text-yellow-950 hover:bg-yellow-500"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div ref={ref} className="w-full py-8 min-h-screen flex flex-col justify-center bg-black">
      <h1 className="text-3xl font-bold mb-6 text-center text-yellow-400">Our Menu</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 px-4 max-w-7xl mx-auto">
        {(isLoading ? ['BURGER', 'SIDE', 'DRINK', 'DESSERT'] : Object.keys(menuItems)).map((category, index) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
          >
            <Card className="bg-yellow-950 border-yellow-400/20 h-[500px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-yellow-400">{category}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto">
                <p className="text-yellow-400/80 mb-4">Delicious {category.toLowerCase()} to satisfy your cravings.</p>
                {renderMenuItems(category, menuItems[category] || [])}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
