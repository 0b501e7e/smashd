'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { MenuItem } from './BasketContext'; // Import MenuItem type

// Define IDs of burgers to feature
const FEATURED_BURGER_IDS = [1, 3, 5]; // Example: Barbacoa, Cheeseburger, Oklahoma 2.0
const placeholderImage = '/burger.png'; // Define placeholder path

export function Hero({ scrollToMenu }: { scrollToMenu: () => void }) {
  const [featuredBurgers, setFeaturedBurgers] = useState<MenuItem[]>([]);
  const [currentBurgerIndex, setCurrentBurgerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedBurgers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          throw new Error("API URL not configured.");
        }
        const menuEndpoint = `${apiUrl}/menu`;
        const response = await fetch(menuEndpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();

        // Handle new API response structure
        const allMenuItems: MenuItem[] = responseData.data || responseData; // Support both old and new formats

        if (!Array.isArray(allMenuItems)) {
          throw new Error('Invalid menu data format received from server');
        }

        // Filter for featured burgers by ID
        const filteredBurgers = allMenuItems.filter(item =>
          item.category === 'BURGER' && FEATURED_BURGER_IDS.includes(item.id)
        );

        if (filteredBurgers.length === 0) {
          console.warn("No featured burgers found with IDs:", FEATURED_BURGER_IDS);
          const anyBurgers = allMenuItems.filter(item => item.category === 'BURGER').slice(0, 3);
          setFeaturedBurgers(anyBurgers);
        } else {
          setFeaturedBurgers(filteredBurgers);
        }

      } catch (err) {
        console.error('Error fetching featured menu items:', err);
        setError('Failed to load featured items.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedBurgers();
  }, []);

  useEffect(() => {
    if (featuredBurgers.length > 1) {
      const timer = setInterval(() => {
        setCurrentBurgerIndex((prev) => (prev + 1) % featuredBurgers.length);
      }, 5000); // Change burger every 5 seconds

      return () => clearInterval(timer);
    }
  }, [featuredBurgers]); // Depend on the fetched burgers array

  // Loading state
  if (isLoading) {
    return (
      <section className="hero bg-gradient-to-br from-gray-900 via-black to-black text-white min-h-screen flex items-center justify-center">
        <p className="text-yellow-400 text-xl animate-pulse">Cargando...</p>
      </section>
    );
  }

  // Error or No Burgers state
  if (!isLoading && featuredBurgers.length === 0) {
    return (
      <section className="hero bg-gradient-to-br from-gray-900 via-black to-black text-white min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg">{error || 'No se pudieron cargar los productos destacados.'}</p>
      </section>
    );
  }

  // Get the current burger data safely
  const currentBurger = featuredBurgers[currentBurgerIndex];

  // *** FIX: Construct the correct image source URL ***
  const baseApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/(v1|api)$/, '');
  const imageSrc = currentBurger?.imageUrl && baseApiUrl
    ? `${baseApiUrl}${currentBurger.imageUrl}` // Prepend base URL
    : placeholderImage;

  return (
    <section className="hero bg-gradient-to-br from-gray-900 via-black to-black text-white min-h-screen flex items-center overflow-hidden relative py-20 md:py-0">
      <div className="container mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center gap-8 md:gap-16 relative z-10">

        {/* Text Content Area */}
        <div className="w-full md:w-1/2 text-center md:text-left flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBurger.id + '-text'} // Unique key for text animation
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
                {currentBurger.name}
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-6 max-w-lg mx-auto md:mx-0">
                {currentBurger.description}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 mb-8">
                <p className="text-2xl sm:text-3xl font-semibold text-gray-200">
                  Desde
                </p>
                <p className="text-4xl sm:text-5xl font-bold text-yellow-400">
                  {formatCurrency(currentBurger.price)}
                </p>
              </div>
              <Button
                size="lg"
                onClick={scrollToMenu}
                className="bg-yellow-400 text-black font-bold text-lg px-8 py-3 rounded-full hover:bg-yellow-500 transition-colors transform hover:scale-105 duration-300 ease-in-out shadow-lg hover:shadow-yellow-500/30"
              >
                PEDIR AHORA
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Image Area */}
        <div className="w-full md:w-1/2 h-64 md:h-auto md:aspect-square relative mt-8 md:mt-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBurger.id + '-image'} // Unique key for image animation
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: -5 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
              className="w-full h-full relative"
            >
              <Image
                src={imageSrc} // Use the correctly constructed imageSrc
                alt={currentBurger.name}
                fill
                style={{ objectFit: 'contain' }} // Use 'contain' to see the whole burger
                priority={currentBurgerIndex === 0} // Prioritize loading the first image
                sizes="(max-width: 768px) 80vw, 40vw"
                onError={(e) => {
                  e.currentTarget.src = placeholderImage;
                }}
                className="drop-shadow-2xl"
              />
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}