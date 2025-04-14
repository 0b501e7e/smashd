import { BasketButton } from './BasketButton';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu as MenuIcon, UtensilsCrossed, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { useDrag } from '@use-gesture/react';

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const sheetContentRef = useRef<HTMLDivElement>(null);

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
      setIsAuthLoading(false);
    };

    const timer = setTimeout(() => {
      checkLoginStatus();
      window.addEventListener('storage', checkLoginStatus);
      const handleAuthChange = () => checkLoginStatus();
      window.addEventListener('authChange', handleAuthChange);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('storage', checkLoginStatus);
        window.removeEventListener('authChange', handleAuthChange);
      };
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setIsMobileMenuOpen(false);
    window.dispatchEvent(new Event('authChange'));
    router.push('/');
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLinkClick = (path: string) => {
    closeMobileMenu();
    router.push(path);
  };

  const NavLink = ({ href, children, icon: Icon }: { href: string, children: React.ReactNode, icon?: React.ElementType }) => {

    const DesktopLink = () => (
      <Button variant="ghost" asChild className="text-white hover:bg-yellow-800/50 hover:text-yellow-300">
        <Link href={href}>{children}</Link>
      </Button>
    );

    const MobileLink = () => (
      <SheetClose asChild>
        <Button
            variant="ghost"
            onClick={() => handleLinkClick(href)}
            className="w-full justify-start text-base text-gray-700 dark:text-gray-200 hover:bg-yellow-100 dark:hover:bg-yellow-800/50"
        >
           {Icon && <Icon className="mr-2 h-5 w-5" />} {children}
        </Button>
      </SheetClose>
    );

    return { DesktopLink, MobileLink };
  };

  const MenuLink = NavLink({ href: '/#menu', children: 'Menu', icon: UtensilsCrossed });
  const ProfileLink = NavLink({ href: '/profile', children: 'Profile', icon: User });
  const LoginLink = NavLink({ href: '/login', children: 'Login', icon: LogIn });
  const RegisterLink = NavLink({ href: '/register', children: 'Register', icon: UserPlus });

  const bind = useDrag(({ down, movement: [mx], velocity: [vx], direction: [dx], distance, cancel, last }) => {
    const triggerDistance = 50;
    const triggerVelocity = 0.3;

    if (last && !down && (vx < -triggerVelocity || mx < -triggerDistance)) {
      if (dx < -0.5) {
        console.log("Swipe detected, closing menu");
        setIsMobileMenuOpen(false);
        if (cancel) cancel();
      }
    }
  }, {
    axis: 'x',
    filterTaps: true,
    threshold: 10,
  });

  return (
    <header style={{ '--navbar-height': '4rem' } as React.CSSProperties} className="bg-black/80 backdrop-blur-sm p-4 fixed top-0 left-0 right-0 z-50 border-b border-yellow-900/50 h-[var(--navbar-height)] flex items-center">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <SheetTrigger asChild className="md:hidden mr-2">
              <Button variant="ghost" size="icon" className={`text-yellow-400 hover:bg-yellow-800/50 p-0 rounded-full ${isAuthLoading ? 'animate-pulse' : ''}`}>
                <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-500/50">
                  <Image
                    src="/smashd.jpg"
                    alt="Open Menu"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="40px"
                  />
                </div>
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>

            <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-yellow-500/50 hidden md:block">
                <Image
                  src="/smashd.jpg"
                  alt="Smash&apos;d Logo"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 640px) 40px, 48px"
                />
              </div>
              <span className="font-bold text-xl sm:text-2xl text-yellow-400 hidden sm:inline">Smash&apos;d</span>
            </Link>
          </div>

          <nav className="hidden md:flex space-x-2 items-center">
            <MenuLink.DesktopLink />
            {isLoggedIn ? (
              <>
                <ProfileLink.DesktopLink />
                <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-yellow-800/50 hover:text-yellow-300">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <>
                <LoginLink.DesktopLink />
                <RegisterLink.DesktopLink />
              </>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            <BasketButton />
          </div>
        </div>

        <SheetContent 
          ref={sheetContentRef} 
          side="left" 
          className="w-[280px] bg-white dark:bg-gray-950 p-4" 
          {...bind()}
          style={{ touchAction: 'pan-y' }}
        >
          <SheetHeader className="mb-4 border-b pb-4">
            <SheetTitle className="text-lg font-semibold text-yellow-500 dark:text-yellow-400">Navigation</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col space-y-2">
            <MenuLink.MobileLink />
            <Separator className="my-2" />
            {isLoggedIn ? (
              <>
                <ProfileLink.MobileLink />
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-base text-gray-700 dark:text-gray-200 hover:bg-yellow-100 dark:hover:bg-yellow-800/50"
                  >
                    <LogOut className="mr-2 h-5 w-5" /> Logout
                  </Button>
                </SheetClose>
              </>
            ) : (
              <>
                <LoginLink.MobileLink />
                <RegisterLink.MobileLink />
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
