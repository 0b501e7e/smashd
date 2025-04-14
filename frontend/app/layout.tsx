'use client'

import { BasketProvider } from './components/BasketContext';
import './globals.css'
import { Navbar } from './components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  const variants = {
    hidden: { opacity: 0 },
    enter: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <html lang="en" className="dark">
      {/* Padding on body pushes content below fixed Navbar */}
      <body className="overflow-x-hidden pt-[var(--navbar-height,4rem)]">
        <BasketProvider>
          <Navbar /> {/* Navbar is rendered first and separate */}          
          {/* Main content area, contains animated children */}
          <main className="relative"> {/* Removed min-height, keep relative for potential stacking context needs */}          
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                variants={variants}
                initial="hidden"
                animate="enter"
                exit="exit"
                transition={{ type: 'tween', duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </BasketProvider>
      </body>
    </html>
  );
}
