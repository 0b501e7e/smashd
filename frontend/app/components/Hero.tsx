'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { MenuItem } from './BasketContext'; // Import MenuItem type

// Remove the hardcoded burgers array
/*
const burgers = [
  {
    name: "Oklahoma 2.0",
    // ... other properties
  },
  // ... other burgers
];
*/

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
        const allMenuItems: MenuItem[] = await response.json();

        // Filter for featured burgers by ID
        const filteredBurgers = allMenuItems.filter(item =>
            item.category === 'BURGER' && FEATURED_BURGER_IDS.includes(item.id)
        );

        if (filteredBurgers.length === 0) {
            // Handle case where no featured burgers are found
            console.warn("No featured burgers found with IDs:", FEATURED_BURGER_IDS);
             // Optionally fetch *any* burgers if featured ones aren't found
             const anyBurgers = allMenuItems.filter(item => item.category === 'BURGER').slice(0, 3);
             setFeaturedBurgers(anyBurgers);
        } else {
             setFeaturedBurgers(filteredBurgers);
        }

      } catch (err) {
        console.error('Error fetching featured menu items:', err);
        setError('Failed to load featured items.');
        // Keep showing something, maybe a default static item?
        // Or setFeaturedBurgers to a default fallback array here
      } finally {
          setIsLoading(false);
      }
    };

    fetchFeaturedBurgers();
  }, []);

  useEffect(() => {
    // Only start the timer if we have burgers to cycle through
    if (featuredBurgers.length > 1) {
        const timer = setInterval(() => {
            setCurrentBurgerIndex((prev) => (prev + 1) % featuredBurgers.length);
        }, 5000); // Change burger every 5 seconds

        return () => clearInterval(timer);
    }
  }, [featuredBurgers.length]); // Rerun when the number of burgers changes

    // Early return or loading state
    if (isLoading) {
        return (
            <section className="hero bg-gradient-to-br from-gray-900 via-black to-black text-white min-h-screen flex items-center justify-center">
                <p className="text-yellow-400 text-xl animate-pulse">Loading...</p>
            </section>
        );
    }

    // Handle case where no burgers could be loaded at all
    if (!isLoading && featuredBurgers.length === 0) {
         return (
             <section className="hero bg-gradient-to-br from-gray-900 via-black to-black text-white min-h-screen flex items-center justify-center">
                 <p className="text-red-500 text-lg">Could not load featured items.</p>
                 {/* Optionally add a button to scroll to menu anyway */}
             </section>
         );
    }

    // Get the current burger data safely
    const currentBurger = featuredBurgers[currentBurgerIndex];

  return (
    <section className="hero bg-gradient-to-br from-gray-900 via-black to-black text-white min-h-screen flex items-center overflow-hidden relative py-20 md:py-0">
      {/* Background shapes/elements (optional) */}
      {/* <div className="absolute inset-0 opacity-10 ...">...</div> */}

      <div className="container mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center gap-8 md:gap-16 relative z-10">

        {/* Text Content Area */}
        <div className="w-full md:w-1/2 text-center md:text-left flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBurger.id + '-text'} // Ensure unique key for text animation
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Optional: Small badge/heading */}
              {/* <span className="text-yellow-400 font-semibold uppercase tracking-wider text-sm mb-2 inline-block">Featured</span> */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
                {currentBurger.name}
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-6 max-w-lg mx-auto md:mx-0">
                {currentBurger.description}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 mb-8">
                 <p className="text-2xl sm:text-3xl font-semibold text-gray-200">
                    Starting at
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
                ORDER NOW
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Image Area */}
        <div className="w-full md:w-1/2 h-64 md:h-auto md:aspect-square relative mt-8 md:mt-0 flex items-center justify-center">
           <AnimatePresence mode="wait">
             <motion.div
                key={currentBurger.id + '-image'} // Unique key for image animation
                className="w-full h-full relative"
                initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotate: -5 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
             >
                <Image
                  src={currentBurger.imageUrl || placeholderImage}
                  alt={currentBurger.name}
                  fill
                  style={{ objectFit: 'contain' }} // Use 'contain' to see the whole burger
                  priority={currentBurgerIndex === 0} // Prioritize loading the first image in the *filtered* array
                  sizes="(max-width: 768px) 80vw, 40vw"
                  onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.src = placeholderImage; // Use the placeholder image
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