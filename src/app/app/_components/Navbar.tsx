'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon, PopoutIcon } from '@/components/icons/svg';
import { WalletButton } from './WalletButton';
import { useRgdPrice } from '@/hooks/useRgdPrice';
import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useAccount } from 'wagmi';
import { Logo } from '@/components/icons/svg';
import { useTenant } from '@/context/TenantContext';
import { isRouteEnabled } from '@/config/appRoutes';

export function Navbar() {
  const { address } = useAccount();
  const { darkMode, toggleTheme } = useTheme();
  const rgdPrice = useRgdPrice();
  const pathname = usePathname();
  const tenant = useTenant();
  const mainUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  const docsUrl = mainUrl?.replace('://', '://docs.');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleHide = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 3000);
    };

    const onScroll = () => {
      if (window.scrollY < 10) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setVisible(true);
      } else {
        setVisible(true);
        scheduleHide();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const allNavLinks: {
    name: string;
    href: string;
    pattern?: string;
    external?: boolean;
  }[] = [
    { name: 'Quests',    href: '/quests',  pattern: '/quests' },
    { name: 'Dashboard', href: address ? `/dashboard/${address}` : '/dashboard', pattern: '/dashboard/[address]' },
    { name: 'Seasons',   href: '/seasons', pattern: '/seasons' },
    { name: 'Stake',     href: '/stake',   pattern: '/stake' },
    { name: 'Swap',      href: '/swap',    pattern: '/swap' },
    { name: 'ICO',       href: '/ico',     pattern: '/ico' },
    { name: 'Faucet',   href: '/faucet',  pattern: '/faucet' },
    { name: 'Docs',      href: `${docsUrl}`, external: true },
  ];

  const navLinks = allNavLinks.filter(
    (link) => link.external || !link.pattern || isRouteEnabled(link.pattern, tenant.key),
  );

  return (
    <>
      <nav className={`nav-container transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
        {/* Brand */}
        <Link href={mainUrl || '/'} className="flex items-center h-18 shrink-0 no-underline" style={{ textDecoration: 'none' }}>
          <Logo className="w-36 text-white" />
        </Link>

        {/* Center Nav Links */}
        <div className="nav-links-track">
          {navLinks.map((link) => {
            const isActive = !link.external && pathname === link.href;
            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link-item flex items-center gap-1"
                >
                  {link.name}
                  <PopoutIcon className="size-3 opacity-60" />
                </a>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link-item${isActive ? ' active' : ''}`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="nav-actions-group h-18">
          <button
            onClick={toggleTheme}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full text-text2 hover:text-text hover:bg-card border border-transparent hover:border-border transition-all"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {rgdPrice !== undefined && (
            <Link href="/swap" className="chip chip-nav hidden sm:flex items-center gap-1.5" style={{ textDecoration: 'none' }}>
              <span className="text-text2 text-[11px]">RGD</span>
              <span className="text-text font-semibold">${rgdPrice.toFixed(6)}</span>
            </Link>
          )}

          <WalletButton />

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-card border border-border text-text"
            aria-label="Open navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Debug: Tailwind breakpoint indicator */}
      {process.env.NEXT_PUBLIC_FRONTEND_DEBUG === 'true' && (
        <div className="fixed top-3 left-3 z-9999 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-text2 shadow-lg">
          <span className="font-semibold text-[--color-gold]">BP:</span>
          <span className="sm:hidden">xs</span>
          <span className="hidden sm:inline md:hidden">sm</span>
          <span className="hidden md:inline lg:hidden">md</span>
          <span className="hidden lg:inline xl:hidden">lg</span>
          <span className="hidden xl:inline 2xl:hidden">xl</span>
          <span className="hidden 2xl:inline">2xl</span>
        </div>
      )}

      {/* Mobile overlay nav */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-200 sm:hidden bg-bg bg-opacity-70 flex justify-center items-center"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-card rounded-lg shadow-xl p-6 w-11/12 max-w-xs relative mx-auto flex flex-col max-h-[85vh]"
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 text-text hover:[background:var(--sunset-glow)] p-1 rounded-full"
              aria-label="Close navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <nav className="mt-4 mb-4 grow overflow-y-auto custom-scrollbar">
              <ul className="space-y-3 pr-2">
                {navLinks.map((link) => {
                  const isActive = !link.external && pathname === link.href;
                  const itemClass = `w-full block text-center py-2 px-4 rounded text-sm font-display font-bold uppercase tracking-[0.05em] text-text transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold ${
                    isActive ? '[background:var(--sunset-glow)]' : 'hover:[background:var(--subtle-glow)]'
                  }`;
                  return (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsModalOpen(false)}
                          className={`${itemClass} flex items-center justify-center gap-2`}
                        >
                          {link.name}
                          <PopoutIcon className="size-3 opacity-60" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={() => setIsModalOpen(false)}
                          className={itemClass}
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center justify-center border-t border-card2 pt-4">
              <button
                onClick={toggleTheme}
                className="bg-card2 flex p-2 rounded-full text-text hover:[background:var(--sunset-glow)] transition-colors duration-300"
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
