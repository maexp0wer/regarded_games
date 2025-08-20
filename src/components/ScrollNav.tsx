// src/components/ScrollNav.tsx

'use client';

import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useTheme } from '@/app/context/ThemeContext'; // Adjust path if needed
import { MoonIcon, SunIcon } from './icons'; // Adjust path to your icons

export type NavLink = {
  id: string;
  label: string;
};

interface ScrollNavProps {
  navLinks: NavLink[];
  activeSection: string | null;
  isNavVisible: boolean;
  scrollToSection: (id: string) => void;
}

const SCROLL_THRESHOLD = 100;
const HIDE_DELAY = 3000;
const CLICK_SCROLL_DELAY = 1000;

export default function ScrollNav({ navLinks, activeSection, isNavVisible, scrollToSection }: ScrollNavProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  
  const prevActiveSectionRef = useRef<string | null>(null);
  const isClickScrollingRef = useRef(false);
  const clickScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { darkMode, toggleTheme } = useTheme();

  // Effect for MOBILE auto-centering (unchanged).
  useEffect(() => {
    if (!isModalOpen || !activeSection) return;
    const mobileScrollOptions: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };
    setTimeout(() => {
      const activeMobileLink = mobileNavRef.current?.querySelector(`[data-nav-id="${activeSection}"]`);
      if (activeMobileLink) activeMobileLink.scrollIntoView(mobileScrollOptions);
    }, 50);
  }, [activeSection, isModalOpen]);

  // Effect for DESKTOP incremental scrolling (for manual page scrolls).
  useEffect(() => {
    if (isClickScrollingRef.current) {
      prevActiveSectionRef.current = activeSection;
      return;
    }
    
    const navContainer = desktopNavRef.current;
    const prevSectionId = prevActiveSectionRef.current;
    const currentSectionId = activeSection;

    if (navContainer && prevSectionId && currentSectionId && prevSectionId !== currentSectionId) {
      const prevIndex = navLinks.findIndex(link => link.id === prevSectionId);
      const currentIndex = navLinks.findIndex(link => link.id === currentSectionId);

      if (prevIndex !== -1 && currentIndex !== -1) {
        const firstItem = navContainer.querySelector('button');
        if (firstItem) {
          const style = window.getComputedStyle(firstItem);
          const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
          const scrollAmount = firstItem.offsetHeight + margin;
          
          if (currentIndex > prevIndex) {
            navContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          } else {
            navContainer.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
          }
        }
      }
    }
    
    prevActiveSectionRef.current = activeSection;

  }, [activeSection, navLinks]);


  // Effect for managing the floating mobile button visibility (unchanged).
  useEffect(() => {
    const handleScroll = () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (window.scrollY > SCROLL_THRESHOLD) {
        setIsButtonVisible(true);
        hideTimeoutRef.current = setTimeout(() => setIsButtonVisible(false), HIDE_DELAY);
      } else {
        setIsButtonVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // MODIFIED: This handler now correctly schedules the delayed nav scroll.
  const handleDesktopLinkClick = (id: string) => {
    // 1. Scroll the main page immediately.
    scrollToSection(id);
    
    // 2. Activate the lock to prevent the incremental scroll effect from firing.
    isClickScrollingRef.current = true;

    // 3. Clear any previous pending click-scrolls.
    if (clickScrollTimeoutRef.current) {
      clearTimeout(clickScrollTimeoutRef.current);
    }

    // 4. Set a 3-second timeout.
    clickScrollTimeoutRef.current = setTimeout(() => {
      // After 3 seconds, find the button corresponding to the clicked ID.
      const targetElement = desktopNavRef.current?.querySelector(`[data-nav-id="${id}"]`);
      if (targetElement) {
        // Perform a smooth "snap-to-center" scroll.
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Finally, release the lock so incremental scrolling can resume.
      isClickScrollingRef.current = false;

    }, CLICK_SCROLL_DELAY);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleMobileLinkClick = (id: string) => {
    closeModal();
    scrollToSection(id);
  };

  return (
    <>
      {/* ============================================= */}
      {/* ======      DESKTOP SIDEBAR NAV        ====== */}
      {/* ============================================= */}
      <div className={`hidden md:inline-block sticky top-0 h-screen transition-opacity duration-300 ${isNavVisible ? 'opacity-100' : 'opacity-0'}`}>
        <nav
          ref={desktopNavRef}
          className="bg-bg w-fit h-full flex flex-col justify-start py-8 p-3 overflow-y-auto custom-scrollbar"
        >
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => handleDesktopLinkClick(link.id)}
              data-nav-id={link.id} // Add data-nav-id back to desktop for this to work
              className={`w-full mx-auto pl-4 pr-4 pt-2 pb-2 m-1 rounded-lg text-right transition-colors duration-300 ${
                activeSection === link.id ? 'bg-card text-text hover:bg-primary hover:text-bg' : 'hover:bg-primary text-text hover:text-bg'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="flex-grow" />
          <div className='w-full mx-auto pr-2 text-right transition-colors duration-300 border-t border-card mt-3 pt-3'>
            <button
              onClick={toggleTheme}
              className="bg-card p-2 rounded-full text-text hover:bg-primary hover:text-bg transition-colors duration-300"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <SunIcon/> : <MoonIcon />}
            </button>
          </div>
        </nav>
      </div>

      {/* ============================================= */}
      {/* ======        MOBILE OVERLAY NAV       ====== */}
      {/* ============================================= */}
      <div className="md:hidden">
        <button
          onClick={openModal}
          className={`fixed top-4 left-4 bg-primary text-bg p-3 rounded-lg shadow-lg z-50 hover:bg-primary2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ease-in-out ${isButtonVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {isModalOpen && (
          <div className="fixed inset-0 bg-bg bg-opacity-70 flex justify-center items-center z-50 text-xl" onClick={closeModal} role="dialog" aria-modal="true">
            <div className="bg-card rounded-lg shadow-xl p-6 w-11/12 max-w-xs relative mx-auto flex flex-col max-h-[85vh]" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
              <button onClick={closeModal} className="absolute top-2 right-2 text-text hover:text-card hover:bg-primary p-1 rounded-full" aria-label="Close navigation menu">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              <nav 
                ref={mobileNavRef}
                className="mt-4 mb-4 flex-grow overflow-y-auto custom-scrollbar"
              >
                <ul className="space-y-3 pr-2">
                  {navLinks.map((link) => (
                    <li key={link.id}>
                      <button
                        onClick={() => handleMobileLinkClick(link.id)}
                        data-nav-id={link.id}
                        className={`w-full block text-center py-2 px-4 rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${link.id === activeSection ? 'font-semibold bg-card2 text-text' : 'text-text hover:bg-primary hover:text-bg'}`}
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="flex items-center justify-center border-t border-card2 pt-4 ">
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
      </div>
    </>
  );
}