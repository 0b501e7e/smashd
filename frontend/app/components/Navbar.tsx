import { BasketButton } from './BasketButton';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu as MenuIcon, Home, UtensilsCrossed, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { Separator } from "@/components/ui/separator";

type NavbarProps = {
  scrollToSection?: (ref: React.RefObject<HTMLDivElement>) => void;
  heroRef?: React.RefObject<HTMLDivElement>;
  menuRef?: React.RefObject<HTMLDivElement>;
  isMainPage?: boolean;
};

export function Navbar({ scrollToSection, heroRef, menuRef, isMainPage = true }: NavbarProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu
  const router = useRouter();

  useEffect(() => {
    // Check login status on initial mount and storage change
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token'); // Assuming token signifies login
      setIsLoggedIn(!!token);
    };

    checkLoginStatus();
    window.addEventListener('storage', checkLoginStatus); // Listen for changes in other tabs/windows

    // Add event listener for user login/logout actions within the app if needed
    // Example: window.addEventListener('authChange', checkLoginStatus);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      // window.removeEventListener('authChange', checkLoginStatus);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token'); // Remove token on logout
    localStorage.removeItem('user'); // Also remove user info if stored separately
    setIsLoggedIn(false);
    setIsMobileMenuOpen(false); // Close mobile menu on logout
    router.push('/'); // Redirect to home or login page
    // Optionally dispatch a custom event if other components need to react
    // window.dispatchEvent(new Event('authChange'));
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleScrollOrLink = (ref?: React.RefObject<HTMLDivElement>, path: string = '/', sectionId?: string) => {
    closeMobileMenu();
    if (isMainPage && ref && scrollToSection) {
      scrollToSection(ref);
    } else {
        if (sectionId) {
            router.push(`/${sectionId}`); // Navigate to homepage section
        } else {
            router.push(path); // Navigate to a different page
        }
    }
  };

  const NavLink = ({ href, sectionRef, sectionId, children, icon: Icon }: { href?: string, sectionRef?: React.RefObject<HTMLDivElement>, sectionId?: string, children: React.ReactNode, icon?: React.ElementType }) => {
    const targetPath = href || (sectionId ? `/#${sectionId}` : '/');
    const action = () => handleScrollOrLink(sectionRef, href, sectionId);

    // For Desktop: Use Button or Link based on isMainPage
    const DesktopLink = () => isMainPage && sectionRef ? (
      <Button variant="ghost" onClick={action} className="text-white hover:bg-yellow-800/50 hover:text-yellow-300">
        {children}
      </Button>
    ) : (
      <Button variant="ghost" asChild className="text-white hover:bg-yellow-800/50 hover:text-yellow-300">
        <Link href={targetPath}>{children}</Link>
      </Button>
    );

    // For Mobile (inside Sheet): Always use a button that closes the sheet
    const MobileLink = () => (
      <SheetClose asChild>
        <Button
            variant="ghost"
            onClick={action}
            className="w-full justify-start text-base text-gray-700 dark:text-gray-200 hover:bg-yellow-100 dark:hover:bg-yellow-800/50"
        >
           {Icon && <Icon className="mr-2 h-5 w-5" />} {children}
        </Button>
      </SheetClose>
    );

    return { DesktopLink, MobileLink };
  };

  const MenuLink = NavLink({ sectionRef: menuRef, sectionId: 'menu', children: 'Menu', icon: UtensilsCrossed });
  const ProfileLink = NavLink({ href: '/profile', children: 'Profile', icon: User });
  const LoginLink = NavLink({ href: '/login', children: 'Login', icon: LogIn });
  const RegisterLink = NavLink({ href: '/register', children: 'Register', icon: UserPlus });


  return (
    <header className="bg-black/80 backdrop-blur-sm p-4 fixed top-0 left-0 right-0 z-50 border-b border-yellow-900/50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-yellow-500/50">
            <Image
              src="/smashd.jpg" // Ensure this path is correct in your public folder
              alt="Smash&apos;d Logo"
              fill // Use fill for responsive sizing within the container
              style={{ objectFit: 'cover' }} // Ensures the image covers the area
              sizes="(max-width: 640px) 40px, 48px" // Optional: optimize image loading
            />
          </div>
           <span className="font-bold text-xl sm:text-2xl text-yellow-400 hidden sm:inline">Smash&apos;d</span>
        </Link>

        {/* Desktop Navigation (hidden on small screens) */}
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

        {/* Right side items: Basket and Mobile Menu Trigger */}
        <div className="flex items-center space-x-3">
          <BasketButton />

          {/* Mobile Menu Trigger (visible on small screens) */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-yellow-800/50">
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-white dark:bg-gray-950 p-4">
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
        </div>
      </div>
    </header>
  );
}
