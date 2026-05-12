'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon, PopoutIcon } from '@/components/icons/svg';
import { WalletButton } from './WalletButton';
import { useState, MouseEvent } from 'react';
import { useAccount } from 'wagmi';

export function Navbar() {
  const { address } = useAccount();
  const { darkMode, toggleTheme } = useTheme();
  const pathname = usePathname();
  const mainUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  const docsUrl = mainUrl?.replace('://', '://docs.');

  const [isModalOpen, setIsModalOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', href: address ? `/dashboard/${address}` : '/dashboard' },
    { name: 'Seasons',   href: '/seasons' },
    { name: 'Stake',     href: '/stake' },
    { name: 'Swap',      href: '/swap' },
    { name: 'Docs',      href: `${docsUrl}`, external: true },
  ];

  return (
    <>
      <nav className="top-0 z-50 w-full">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-4">

          {/* ── Brand ── */}
          <Link
            href={mainUrl || '/'}
            className="flex items-center gap-3 no-underline"
            style={{ textDecoration: 'none' }}
          >
            {/* Gold mark */}
            <div
              className="flex items-center justify-center w-8 h-8 rounded-[9px] font-mono text-[14px] font-bold shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--color-gold-soft), var(--color-gold))',
                color: '#1a1305',
                boxShadow: '0 6px 20px -8px rgba(245,184,0,0.6)',
              }}
            >
              R
            </div>
            {/* Wordmark */}
            <div className="flex items-center gap-1.5">
              <span
                className="font-display font-extrabold text-[18px] tracking-[-0.01em] text-text leading-none"
              >
                REGARDED GAMES
              </span>
              <span className="font-mono text-[10px] font-medium text-text2 uppercase tracking-[0.04em] mt-0.5 hidden sm:block">
                v0.4
              </span>
            </div>
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = !link.external && pathname === link.href;
              if (link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3.5 py-2 rounded-full font-sans text-[13px] font-medium text-text2 hover:text-text transition-colors"
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
                  className={`px-3.5 py-2 rounded-full font-sans text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'text-text bg-card border border-border'
                      : 'text-text2 hover:text-text'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* ── Right: theme toggle + wallet ── */}
          <div className="flex items-center gap-3">
            {/* Theme toggle — desktop */}
            <button
              onClick={toggleTheme}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-full text-text2 hover:text-text hover:bg-card border border-transparent hover:border-border transition-all"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            <WalletButton />

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-card border border-border text-text"
              aria-label="Open navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile overlay nav ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[51] md:hidden"
          style={{ background: 'rgba(11,10,9,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute top-4 right-4 w-64 rounded-[20px] border border-border p-5 flex flex-col gap-1"
            style={{ background: 'var(--color-card)' }}
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="self-end mb-2 w-7 h-7 flex items-center justify-center rounded-full text-text2 hover:text-text hover:bg-card2 transition-colors"
              aria-label="Close navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Nav links */}
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
                          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl font-sans text-sm font-medium text-text2 hover:text-text hover:bg-card2 transition-colors"
                        >
                          {link.name}
                          <PopoutIcon className="size-3 opacity-60 ml-auto" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={() => setIsModalOpen(false)}
                          className={`block w-full px-3 py-2.5 rounded-xl font-sans text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-text bg-card2'
                              : 'text-text2 hover:text-text hover:bg-card2'
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

            {/* Theme toggle */}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="font-mono text-[10px] text-text2 uppercase tracking-[0.12em]">Theme</span>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-text2 hover:text-text hover:border-border-bright transition-all text-sm"
              >
                {darkMode ? <><SunIcon /> <span className="font-mono text-[11px]">Light</span></> : <><MoonIcon /> <span className="font-mono text-[11px]">Dark</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
