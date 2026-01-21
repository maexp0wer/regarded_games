'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon } from '@/components/icons/svg';
import { WalletButton } from './WalletButton';
import { Logo } from '@/components/icons/svg';



export function Navbar() {
    const { darkMode, toggleTheme } = useTheme();
    const pathname = usePathname();
    const mainUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;

    const docsUrl = mainUrl?.replace("://", "://docs.");

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Seasons', href: '/seasons' },
        { name: 'Staking', href: '/staking' },
        { name: 'Docs', href: `${docsUrl}`, external: true },
    ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[--color-border] bg-[--color-card]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Brand/Logo */}
        <div className="flex items-center gap-8">
          <div className={`text-primary flex justify-center items-center font-display ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}>
        <Link href={mainUrl || '/'}><Logo className="w-40 text-white" /></Link>
      </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-text">
            {navLinks.map((link) => {
                // Check if it's an external/cross-subdomain link
                if (link.external) {
                    return (
                    <a
                        key={link.href}
                        href={link.href}
                        target="_blank"     // Opens in new tab (standard for docs)
                        rel="noopener noreferrer" // Security best practice
                        className="text-sm font-bold uppercase tracking-widest text-[--color-text2] hover:text-[--color-primary] transition-colors"
                    >
                        {link.name}
                    </a>
                    );
                }

                // Standard Internal Link
                return (
                    <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-bold uppercase tracking-widest transition-colors ${
                        pathname === link.href ? 'text-[--color-primary]' : 'text-[--color-text2] hover:text-[--color-primary]'
                    }`}
                    >
                    {link.name}
                    </Link>
                );
                })}
          </div>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-4">
          

          {/* Mode Switcher */}
          <button
              onClick={toggleTheme}
              className="bg-card p-2 rounded-full text-text hover:bg-primary hover:text-bg transition-colors duration-300"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <SunIcon/> : <MoonIcon />}
            </button>
            <WalletButton />
        </div>
      </div>
    </nav>
  );
}