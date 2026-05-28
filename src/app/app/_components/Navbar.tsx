'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon, PopoutIcon } from '@/components/icons/svg';
import { WalletButton } from './WalletButton';
import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useAccount } from 'wagmi';
import { Logo } from '@/components/icons/svg';
import { useTenant } from '@/context/TenantContext';
import { isRouteEnabled } from '@/config/appRoutes';

export function Navbar() {
  const { address } = useAccount();
  const { darkMode, toggleTheme } = useTheme();
  const pathname = usePathname();
  const tenant = useTenant();
  const mainUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  const docsUrl = mainUrl?.replace('://', '://docs.');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setVisible(current < lastScrollY.current || current < 10);
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const allNavLinks: {
    name: string;
    href: string;
    pattern?: string;
    external?: boolean;
  }[] = [
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
        <Link href={mainUrl || '/'} className="flex items-center no-underline" style={{ textDecoration: 'none' }}>
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
        <div className="nav-actions-group">
          <button
            onClick={toggleTheme}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full text-text2 hover:text-text hover:bg-card border border-transparent hover:border-border transition-all"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

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
      {process.env.NEXT_PUBLIC_DEBUG === 'true' && (
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
          className="fixed inset-0 z-200 sm:hidden"
          style={{ background: 'var(--color-card3)', backdropFilter: 'blur(8px)' }}
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute top-4 right-4 w-64 rounded-[20px] border border-border p-5 flex flex-col gap-1"
            style={{ background: 'var(--color-card)' }}
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="self-end mb-2 w-7 h-7 flex items-center justify-center rounded-full text-text2 hover:text-text hover:bg-card2 transition-colors"
              aria-label="Close navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <nav>
              <ul className="space-y-0.5">
                {navLinks.map((link) => {
                  const isActive = !link.external && pathname === link.href;
                  return (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsModalOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg font-sans text-sm font-medium text-text2 hover:text-text hover:bg-card2 transition-colors"
                        >
                          {link.name}
                          <PopoutIcon className="size-3 opacity-60 ml-auto" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={() => setIsModalOpen(false)}
                          className={`block w-full px-3 py-2.5 rounded-lg font-sans text-sm font-medium transition-colors ${
                            isActive ? 'text-text bg-card2' : 'text-text2 hover:text-text hover:bg-card2'
                          }`}
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="font-mono text-[10px] text-text2 uppercase tracking-[0.12em]">Theme</span>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-text2 hover:text-text hover:border-border-bright transition-all text-sm"
              >
                {darkMode
                  ? <><SunIcon /><span className="font-mono text-[11px]">Light</span></>
                  : <><MoonIcon /><span className="font-mono text-[11px]">Dark</span></>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
