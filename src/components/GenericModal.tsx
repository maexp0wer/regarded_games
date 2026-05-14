// components/GenericModal.tsx
'use client';

import React, {
  ReactNode,
  FC,
  MouseEvent,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

interface GenericModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

const GenericModal: FC<GenericModalProps> = ({
  isOpen,
  onClose,
  children,
  title = 'Modal Window',
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const body = document.body; // Get the body element

    // --- Handle Background Scroll ---
    if (isOpen) {
      // Add class to body to prevent scrolling
      body.classList.add('overflow-hidden');

      // Add Escape key listener
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);

      // Cleanup function for THIS effect run (when isOpen becomes false OR component unmounts while open)
      return () => {
        // Remove class from body to re-enable scrolling
        body.classList.remove('overflow-hidden');
        document.removeEventListener('keydown', handleEscape);
      };
    }
    // If isOpen becomes false, the cleanup function from the previous render
    // (when isOpen was true) takes care of removing the class.
    // If the component unmounts while isOpen is false, this effect doesn't run
    // the isOpen block, and no cleanup for the class is needed.

  }, [isOpen, onClose]); // Depend on isOpen to trigger effect

  const portalRoot = isClient ? document.getElementById('modal-root') : null;

  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg bg-opacity-70 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-id"
    >
      <div
        className={`
          flex flex-col
          relative overflow-auto rounded-xl bg-card p-6 shadow-xl
          
          // --- Mobile-first styles (default) ---
          // On small screens, it takes up most of the viewport
          w-[95vw] h-[95vh]

          // --- Desktop styles (for medium screens and up) ---
          // On screens md (768px) and larger, we override the mobile styles
          md:w-full 
          md:max-w-2xl
          md:h-auto
          md:max-h-[95vh]
        `}
        onClick={handleContentClick}
      >
        <h2 id="modal-title-id" className="sr-only">{title}</h2>
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1 text-text transition-colors hover:bg-gold hover:text-bg"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
        {/* Added pt-8 to give space below close button */}
        <div className="h-full pt-8">
            {children}
        </div>
      </div>
    </div>
  );

  // --- Conditional Rendering Logic ---
  if (!isOpen) {
    return null;
  }
  if (!isClient || !portalRoot) {
    return null;
  }
  return createPortal(modalContent, portalRoot);
};

export default GenericModal;