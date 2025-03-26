import { BasketButton } from './BasketButton';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type NavbarProps = {
  scrollToSection?: (ref: React.RefObject<HTMLDivElement>) => void;
  heroRef?: React.RefObject<HTMLDivElement>;
  menuRef?: React.RefObject<HTMLDivElement>;
  isMainPage?: boolean;
};

export function Navbar({ scrollToSection, heroRef, menuRef, isMainPage = true }: NavbarProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = () => {
      const user = localStorage.getItem('user');
      setIsLoggedIn(!!user);
    };

    checkLoginStatus();
    window.addEventListener('storage', checkLoginStatus);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <header className="bg-black p-4 fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="relative w-12 h-12 rounded-full overflow-hidden">
          <Image
            src="/smashd.jpg"
            alt="Smash'd Logo"
            layout="fill"
            className="absolute inset-0 w-full h-full"
          />
        </div>
        <nav>
          <ul className="flex space-x-4 items-center">
            <li>
              {isMainPage ? (
                <button onClick={() => scrollToSection?.(heroRef!)} className="text-white hover:text-gray-200">
                  Home
                </button>
              ) : (
                <Link href="/" className="text-white hover:text-gray-200">
                  Home
                </Link>
              )}
            </li>
            <li>
              {isMainPage ? (
                <button onClick={() => scrollToSection?.(menuRef!)} className="text-white hover:text-gray-200">
                  Menu
                </button>
              ) : (
                <Link href="/#menu" className="text-white hover:text-gray-200">
                  Menu
                </Link>
              )}
            </li>
            {isLoggedIn ? (
              <>
                <li>
                  <Link href="/profile" className="text-white hover:text-gray-200">
                    Profile
                  </Link>
                </li>
                <li>
                  <button onClick={handleLogout} className="text-white hover:text-gray-200">
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" className="text-white hover:text-gray-200">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-white hover:text-gray-200">
                    Register
                  </Link>
                </li>
              </>
            )}
            <li>
              <BasketButton />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
