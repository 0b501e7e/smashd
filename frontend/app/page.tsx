'use client'

import { useRef } from 'react';
import { Hero } from './components/Hero';
import { Menu } from './components/Menu';

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pt-[var(--navbar-height,4rem)]">
      <main>
        <div ref={heroRef}>
          <Hero scrollToMenu={() => scrollToSection(menuRef)} />
        </div>
        <div ref={menuRef} id="menu">
          <Menu />
        </div>
      </main>
    </div>
  );
}
