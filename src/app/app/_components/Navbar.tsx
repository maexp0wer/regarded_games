'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon, PopoutIcon } from '@/components/icons/svg';
import { WalletButton } from './WalletButton';
import { Logo } from '@/components/icons/svg';
import { useState, MouseEvent } from 'react';
import { useAccount } from 'wagmi';

export function Navbar() {
  const { address } = useAccount();
  const { darkMode, toggleTheme } = useTheme();
  const pathname = usePathname();
  const mainUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;

  const docsUrl = mainUrl?.replace("://", "://docs.");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const navLinks = [
      { 
          name: 'Dashboard', 
          href: address ? `/dashboard/${address}` : '/dashboard' 
      },
      { name: 'Seasons', href: '/seasons' },
      { name: 'Stake', href: '/stake' },
      { name: 'Swap', href: '/swap' },
      { name: 'Docs', href: `${docsUrl}`, external: true },
  ];

  return (
    <>
      <nav className="top-0 z-50 w-full backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-8">
            <div className={`text-primary flex justify-center items-center font-display`}>
              <Link href={mainUrl || '/'}><Logo className="w-40" /></Link>
            </div>

            {/* Navigation Links (Desktop Only) */}
            <div className="hidden md:flex items-center gap-6 text-text">
              {navLinks.map((link) => {
                  if (link.external) {
                      return (
                      <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          // Added inline-flex, items-center, and gap-1 for the icon
                          className="text-sm font-bold transition-colors text-text2 hover:text-text inline-flex items-center gap-1"
                      >
                          {link.name}
                          <PopoutIcon className="size-3 opacity-70" />
                      </a>
                      );
                  }
                  return (
                      <Link
                      key={link.href}
                      href={link.href}
                      className={`text-sm font-bold transition-colors ${
                          pathname === link.href 
                            ? 'text-primary' 
                            : 'text-text2 hover:text-text' 
                      }`}
                      >
                      {link.name}
                      </Link>
                  );
                  })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <button
                  onClick={toggleTheme}
                  className="bg-card p-1.5 rounded-full text-text hover:bg-primary hover:text-bg transition-colors duration-300"
                  aria-label="Toggle dark mode"
                >
                {darkMode ? <SunIcon/> : <MoonIcon />}
              </button>
              <WalletButton />
            </div>

            <div className="md:hidden">
              <WalletButton />
            </div>

            <button
                onClick={openModal}
                className="md:hidden bg-primary text-bg p-2 rounded-lg shadow-lg z-50 hover:opacity-90 transition-opacity"
                aria-label="Open navigation menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE OVERLAY NAV */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-bg bg-opacity-70 flex justify-center items-center z-[51] text-xl md:hidden" 
          onClick={closeModal} 
          role="dialog" 
          aria-modal="true"
        >
          <div 
            className="bg-card rounded-lg shadow-xl p-6 w-11/12 max-w-xs relative mx-auto flex flex-col max-h-[85vh]" 
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <button 
              onClick={closeModal} 
              className="absolute top-2 right-2 text-text hover:text-bg hover:bg-primary p-1 rounded-full" 
              aria-label="Close navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <nav className="mt-4 mb-4 grow overflow-y-auto custom-scrollbar">
              <ul className="space-y-3 pr-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeModal}
                        // Added flex, justify-center, items-center, and gap-1
                        className="w-full flex justify-center items-center gap-1 py-2 px-4 rounded transition duration-150 ease-in-out font-bold text-text hover:bg-primary hover:text-bg"
                      >
                        {link.name}
                        <PopoutIcon className="size-3" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={closeModal}
                        className={`w-full block text-center py-2 px-4 rounded transition duration-150 ease-in-out font-bold ${
                          pathname === link.href 
                            ? 'font-semibold bg-card2 text-text' 
                            : 'text-text hover:bg-primary hover:text-bg'
                        }`}
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center justify-center gap-3 border-t border-card2 pt-4 ">
                <button
                  onClick={toggleTheme}
                  className="bg-card2 flex p-2 rounded-full text-text hover:bg-primary hover:text-bg transition-colors duration-300"
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? <SunIcon /> : <MoonIcon />}
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}