// src/components/ScrollNav.tsx

'use client';

import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useTheme } from '@/context/ThemeContext'; // Adjust path if needed
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
  
  const [isOverflowing, setIsOverflowing] = useState(false);
  // NEW: Internal state to control the visual highlight, preventing flickering.
  const [highlightedSection, setHighlightedSection] = useState<string | null>(activeSection);
  
  const { darkMode, toggleTheme } = useTheme();

  // NEW: Effect to synchronize the internal highlight state with the external prop.
  useEffect(() => {
    // If a click-scroll is NOT in progress, the highlight should follow the active section.
    if (!isClickScrollingRef.current) {
      setHighlightedSection(activeSection);
    }
  }, [activeSection]);


  // Effect to check if the desktop nav content overflows its container.
  useEffect(() => {
    const checkOverflow = () => {
      const container = desktopNavRef.current;
      if (container) {
        const hasOverflow = container.scrollHeight > container.clientHeight;
        setIsOverflowing(hasOverflow);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [navLinks]);


  // Effect for MOBILE auto-centering.
  useEffect(() => {
    if (!isModalOpen || !activeSection) return;
    const mobileScrollOptions: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };
    setTimeout(() => {
      const activeMobileLink = mobileNavRef.current?.querySelector(`[data-nav-id="${activeSection}"]`);
      if (activeMobileLink) activeMobileLink.scrollIntoView(mobileScrollOptions);
    }, 50);
  }, [activeSection, isModalOpen]);

  // Effect for DESKTOP incremental scrolling.
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

  // Effect for managing the floating mobile button visibility.
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

  // MODIFIED: This handler now also controls the highlight state.
  const handleDesktopLinkClick = (id: string) => {
    scrollToSection(id);
    isClickScrollingRef.current = true;
    
    // Immediately remove the highlight.
    setHighlightedSection(null);

    if (clickScrollTimeoutRef.current) {
      clearTimeout(clickScrollTimeoutRef.current);
    }

    clickScrollTimeoutRef.current = setTimeout(() => {
      const navContainer = desktopNavRef.current;
      const targetElement = navContainer?.querySelector<HTMLElement>(`[data-nav-id="${id}"]`);

      if (navContainer && targetElement) {
        const containerHeight = navContainer.clientHeight;
        const targetOffsetTop = targetElement.offsetTop;
        const targetHeight = targetElement.clientHeight;
        const scrollTop = targetOffsetTop - (containerHeight / 2) + (targetHeight / 2);
        navContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }
      
      // After the delay and scroll, restore the highlight to the destination.
      setHighlightedSection(id);
      // Release the lock so the sync effect can take over.
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
          className={`bg-bg w-fit h-full flex flex-col p-3 overflow-y-auto custom-scrollbar ${
            isOverflowing ? 'justify-start py-8' : 'justify-center'
          }`}
        >
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => handleDesktopLinkClick(link.id)}
              data-nav-id={link.id}
              className={`w-full mx-auto pl-4 pr-4 pt-2 pb-2 m-1 rounded-lg text-right transition-colors duration-300 ${
                // MODIFIED: Use the internal `highlightedSection` state for styling.
                highlightedSection === link.id ? 'bg-card text-text hover:bg-primary hover:text-bg' : 'hover:bg-primary text-text hover:text-bg'
              }`}
            >
              {link.label}
            </button>
          ))}
          {isOverflowing && <div className="flex-grow" />}
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
                        className={`w-full block text-center py-2 px-4 rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                          // MODIFIED: Use the internal `highlightedSection` state for styling on mobile too.
                          highlightedSection === link.id ? 'font-semibold bg-card2 text-text' : 'text-text hover:bg-primary hover:text-bg'
                        }`}
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