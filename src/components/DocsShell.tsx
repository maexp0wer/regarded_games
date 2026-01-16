// src/components/DocsShell.tsx
'use client';

/*
Usage of Links:
My Title → my-title
Same Document:
See the [Game Setup](#game-setup) section for details
Different Document:
Check the [Rules of Play](/docs/rules#winning-the-game) to see how to win.
*/

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { MoonIcon, SunIcon } from './icons/svg';
import { DocMetadata } from '@/lib/docs-structure';
import { HeadingNode } from '@/lib/toc';
import { SearchIndexItem } from '@/lib/docs';
import { Logo } from '@/components/icons/svg';

interface DocsShellProps {
  children: React.ReactNode;
  docs: DocMetadata[];
  currentHeadings?: HeadingNode[];
  searchIndex?: SearchIndexItem[];
}

export default function DocsShell({ 
  children, 
  docs, 
  currentHeadings = [], 
  searchIndex = [] 
}: DocsShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- NEW: Refs to manage scroll locking ---
  const isClickScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const pathname = usePathname();
  const { darkMode, toggleTheme } = useTheme();

  // --- Scroll Spy Logic ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // FIX: If we are scrolling because of a click, ignore these updates
        // to prevent the sidebar from flickering through every section.
        if (isClickScrolling.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0% -66%' }
    );

    currentHeadings.forEach(h1 => {
      const el = document.getElementById(h1.id);
      if (el) observer.observe(el);
      h1.children.forEach(h2 => {
        const subEl = document.getElementById(h2.id);
        if (subEl) observer.observe(subEl);
      });
    });

    return () => observer.disconnect();
  }, [currentHeadings, pathname]);

  // --- Helper: Handle Click & Scroll ---
  const handleLinkClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    
    // 1. Lock the observer so it doesn't update while scrolling
    isClickScrolling.current = true;
    
    // 2. Set the destination active IMMEDIATELY (Stable UI)
    setActiveId(id);

    // 3. Perform the scroll
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }

    // 4. Unlock after animation (approx 1000ms is safe for most smooth scrolls)
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 1000);
  };


  // --- Filter Logic ---
  const searchResults = searchQuery 
    ? searchIndex.filter(item => 
        item.headingTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.docTitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const isFileActive = (slug: string) => pathname.endsWith(`/${slug}`);

  // Determine if a parent H1 should be open
  const isH1Open = (h1: HeadingNode) => {
    if (activeId === h1.id) return true;
    return h1.children.some(child => activeId === child.id);
  };

  const isH2Open = (h2: HeadingNode) => {
    // Open if the H2 itself is active
    if (activeId === h2.id) return true;
    // OR if any of its H3 children are active
    return h2.children.some(h3 => activeId === h3.id);
  };

  // --- Sidebar Content ---
  const SidebarContent = () => (
    <nav className="space-y-4 py-4 px-2 pb-20">
      
      {/* SEARCH MODE */}
      {searchQuery ? (
        <div className="space-y-1">
          <p className="px-2 text-xs font-semibold text-text/50 uppercase tracking-wider mb-2">
            Results
          </p>
          {searchResults.map((result, idx) => (
            <Link
              key={`${result.docSlug}-${result.headingId}-${idx}`}
              href={`/docs/${result.docSlug}${result.headingId ? `#${result.headingId}` : ''}`}
              className="block px-4 py-2 text-sm rounded-md hover:bg-card transition-colors group"
            >
              <span className="font-medium text-text group-hover:text-primary">
                {result.headingTitle}
              </span>
              {result.level > 1 && (
                 <span className="block text-xs text-text/50 mt-0.5 group-hover:text-primary/70">
                    in {result.docTitle}
                 </span>
              )}
            </Link>
          ))}
          {searchResults.length === 0 && (
            <p className="px-4 text-sm text-text/50 italic">No results found.</p>
          )}
        </div>
      ) : (
        /* STANDARD NAV MODE */
        <>
          {docs.map((doc) => {
            const isDocActive = isFileActive(doc.slug);
            const hasHeadings = isDocActive && currentHeadings.length > 0;

            // CASE 1: Active Page with Headings (Render H1s as Root)
            if (hasHeadings) {
              return (
                <div key={doc.slug} className="mb-2 space-y-0.5">
                  {currentHeadings.map((h1) => {
                    const h1Active = activeId === h1.id;
                    return (
                      <div key={h1.id} className="relative">
                        {/* Level 0: H1 (Mimics the root Doc Title style) */}
                        <a
                          href={`#${h1.id}`}
                          onClick={(e) => handleLinkClick(e, h1.id)}
                          className={`block px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                            h1Active
                              ? 'bg-card text-primary font-bold shadow-sm' 
                              : 'text-text font-bold hover:bg-primary hover:text-bg'
                          }`}
                        >
                          {h1.title}
                        </a>

                        {/* Level 1: H2 (Indented) */}
                        {h1.children.length > 0 && (
                          <div className="ml-4 border-l-2 border-card pl-2 mt-1 space-y-0.5">
                            {h1.children.map((h2) => {
                              const h2Active = activeId === h2.id;
                              const h2IsOpen = isH2Open(h2);

                              return (
                                <div key={h2.id}>
                                  <a
                                    href={`#${h2.id}`}
                                    onClick={(e) => handleLinkClick(e, h2.id)}
                                    className={`block px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                                      h2Active
                                        ? 'text-primary font-semibold bg-card/50'
                                        : 'text-text/70 hover:bg-primary hover:text-bg'
                                    }`}
                                  >
                                    {h2.title}
                                  </a>

                                  {/* Level 2: H3 (Double Indented, conditional visibility) */}
                                  {h2.children.length > 0 && (
                                    <div
                                      className={`ml-3 border-l border-card/50 overflow-hidden transition-all duration-300 ${
                                        h2IsOpen ? 'max-h-[300px] opacity-100 my-1' : 'max-h-0 opacity-0'
                                      }`}
                                    >
                                      {h2.children.map((h3) => (
                                        <a
                                          key={h3.id}
                                          href={`#${h3.id}`}
                                          onClick={(e) => handleLinkClick(e, h3.id)}
                                          className={`block px-3 py-1 text-[11px] rounded-md transition-all duration-200 ${
                                            activeId === h3.id
                                              ? 'text-primary font-medium'
                                              : 'text-text/60 hover:text-primary'
                                          }`}
                                        >
                                          {h3.title}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            // CASE 2: Inactive Page OR Active Page without headings (Fallback to Title)
            return (
              <div key={doc.slug} className="mb-2">
                <Link
                  href={`/docs/${doc.slug}`}
                  className="block px-4 py-2 text-sm rounded-md text-text font-bold hover:bg-primary hover:text-bg transition-all duration-200"
                >
                  {doc.title}
                </Link>
              </div>
            );
          })}
        </>
      )}
    </nav>
  );

  return (
    <div className="flex flex-col min-h-screen bg-bg text-text transition-colors duration-300">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-card bg-bg/80 backdrop-blur-md">
        <div className="flex h-16 items-center px-4 md:px-6 gap-4">
          <button onClick={() => setIsOpen(true)} className="md:hidden p-2 -ml-2 rounded-md hover:bg-card text-text">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className='text-primary flex justify-center items-center '>
                      <Link href="/"><Logo className="w-40 text-white" /></Link>
                    </div>
          <div className="font-bold text-lg md:text-xl whitespace-nowrap hidden sm:block pl-5">Documentation</div>
          <div className="flex-1 flex justify-center max-w-md mx-auto">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-transparent focus:border-primary rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none transition-all"
              />
            </div>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-card transition-colors">
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1">
        <aside className="hidden md:block w-64 border-r border-card fixed top-16 bottom-0 overflow-y-auto custom-scrollbar bg-bg pt-2">
          <SidebarContent />
        </aside>

        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-bg p-6 shadow-xl">
              <SidebarContent />
            </div>
          </div>
        )}

        <main className="flex-1 w-full md:pl-64 flex flex-col">
           {/* Add 'mdx-content' to this div */}
           <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-12 flex-1 mdx-content">
              {children}
           </div>

        </main>
      </div>
    </div>
  );
}