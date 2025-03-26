'use client'

import { BasketProvider } from './components/BasketContext';
import './globals.css'
import { Navbar } from './components/Navbar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <BasketProvider>
          <Navbar isMainPage={false} />
          {children}
        </BasketProvider>
      </body>
    </html>
  );
}
