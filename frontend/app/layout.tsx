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
    hidden: { opacity: 0, x: 200 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -200 },
  };

  return (
    <html lang="en" className="dark">
      <body className="overflow-x-hidden">
        <BasketProvider>
          <Navbar isMainPage={false} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              variants={variants}
              initial="hidden"
              animate="enter"
              exit="exit"
              transition={{ type: 'tween', duration: 0.3 }}
              className="min-h-[calc(100vh-var(--navbar-height,4rem))]"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </BasketProvider>
      </body>
    </html>
  );
}
