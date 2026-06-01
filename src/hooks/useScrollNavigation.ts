'use client';

import { useEffect, useState } from 'react';

interface HTMLElementWithOffset extends HTMLElement {
  offsetTop: number;
  offsetHeight: number;
}

export const useScrollNavigation = () => {
  const [activeSection, setActiveSection] = useState('');
  const [isNavVisible, setIsNavVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      const sections = document.querySelectorAll<HTMLElementWithOffset>('section[id]');

      const headerHeight = header?.clientHeight || 0;
      const buffer = 100;

      // Show/hide side navigation: hidden at the very top, appears as soon as
      // the user scrolls down past a small threshold.
      const SHOW_NAV_THRESHOLD = 80;
      setIsNavVisible(window.scrollY > SHOW_NAV_THRESHOLD);

      // Update active section
      const scrollPosition = window.scrollY + headerHeight + buffer;
      let currentActive = '';

      sections.forEach((section: HTMLElementWithOffset) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          currentActive = section.id;
        }
      });

      setActiveSection(currentActive);
    };

    // Throttle scroll events
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll);
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id) as HTMLElementWithOffset | null;
    const header = document.querySelector('header') as HTMLElement | null;
    const headerHeight = header?.offsetHeight || 0;

    if (section) {
      window.scrollTo({
        top: section.offsetTop - headerHeight,
        behavior: 'smooth'
      });
    }
  };

  return { activeSection, isNavVisible, scrollToSection };
};