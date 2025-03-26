'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const burgers = [
  {
    name: "NEW ONION BURGER",
    price: "£19.00",
    description: "Fast food for fast times and convenience.",
    image: "/burger.png"
  },
  {
    name: "CLASSIC CHEESEBURGER",
    price: "£15.00",
    description: "A timeless favorite with a juicy patty and melted cheese.",
    image: "/cheeseburger.png"
  },
  {
    name: "SPICY JALAPENO BURGER",
    price: "£17.00",
    description: "For those who like it hot and flavorful.",
    image: "/spicyburger.png"
  }
  // Add more burgers as needed
];

export function Hero({ scrollToMenu }: { scrollToMenu: () => void }) {
  const [currentBurger, setCurrentBurger] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBurger((prev) => (prev + 1) % burgers.length);
    }, 5000); // Change burger every 5 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero bg-yellow-400 text-black h-screen flex items-center overflow-hidden relative">
      <div className="container mx-auto px-4 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentBurger}
            className="w-1/2 z-10"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-black-400 text-4xl mb-2">Limited edition</h2>
            <h1 className="text-8xl font-bold mb-4">{burgers[currentBurger].name}</h1>
            <p className="text-2xl mb-4">{burgers[currentBurger].description}</p>
            <p className="text-3xl mb-6">From price <span className="text-yellow-400 text-6xl font-bold">{burgers[currentBurger].price}</span></p>
            <button 
              onClick={scrollToMenu}
              className="bg-black text-white px-12 py-4 rounded-full text-2xl font-bold hover:bg-black/80 transition-colors inline-flex items-center"
            >
              ORDER NOW
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentBurger}
          className="absolute right-[-5%] top-[10%] w-[70%] h-[90%]"
          initial={{ opacity: 0, x: 100, rotate: -10 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: -100, rotate: 10 }}
          transition={{ duration: 0.5 }}
        >
          <Image 
            src={burgers[currentBurger].image}
            alt={burgers[currentBurger].name}
            layout="fill"
            objectFit="contain"
            className="object-right"
          />
        </motion.div>
      </AnimatePresence>
    </section>
  );
}