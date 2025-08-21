// components/MultiStageModal.tsx
'use client'; // Needs client-side hooks, state, and DOM access

import React, {
  ReactNode,
  FC,
  MouseEvent,
  useEffect,
  useState,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

import { ArrowLeft, ArrowRight} from './svg';

// --- Props Interface for the Combined Modal ---
interface MultiStageModalProps { 
  isOpen: boolean;          // Is the modal open? (Controlled by parent)
  onClose: () => void;      // Function to close the modal (from parent)
  title?: string;         // Optional title for accessibility
  // Array of React Nodes for top/left section, INDEX 0 IS THE INTRO/STEP 0
  topParts: ReactNode[];
  // Array of React Nodes (Complete SVG Component instances for each step)
  // INDEX 0 IS FOR STEP 0 (often null), INDEX 1 FOR STEP 1, etc.
  // MUST have the same length as topParts
  bottomParts: ReactNode[];
  // Optional: Can still be useful for default aspect ratio if needed,
  // but primary viewBox should be on the individual step SVGs.
  svgContainerAspectRatio?: string; // e.g., '16 / 9' or '1 / 1' for the container
}

// --- The Combined Modal Component ---
const MultiStageModal: FC<MultiStageModalProps> = ({
  isOpen,
  onClose,
  title = 'Multi-Stage Modal', // Default title
  topParts = [],        // Default to empty array
  bottomParts = [],     // Default to empty array
  svgContainerAspectRatio = '1 / 1', // Default aspect ratio for container
}) => {
  // --- State Management ---
  const [isClient, setIsClient] = useState(false); // For portal rendering
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 = Intro/Step 0, 1 = Step 1, ...

  // --- Refs ---
  const scrollContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable area
  // const isWheelingRef = useRef(false); // Ref to track if a wheel action is being processed
  

  // --- Basic Validation & Setup ---
  const totalSteps = topParts.length > 0 ? topParts.length : 1;
  // Check if lengths match now
  if (topParts.length > 0 && topParts.length !== bottomParts.length) {
     console.warn(`MultiStageModal: Expected topParts (${topParts.length}) and bottomParts (${bottomParts.length}) to have the same length! Step 0 for bottomParts can be null.`);
  }

  // --- Effects ---
  useEffect(() => { // Effect for client-side mounting for portal
    setIsClient(true);
  }, []);

  useEffect(() => { // Effect for body scroll lock and Escape key
    const body = document.body;
    if (isOpen) {
      body.classList.add('overflow-hidden');
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') { onClose(); }
      };
      document.addEventListener('keydown', handleEscape);
      // Cleanup function for this effect run
      return () => {
        body.classList.remove('overflow-hidden');
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      // Ensure class is removed if modal closes unexpectedly while open
      body.classList.remove('overflow-hidden');
    }
  }, [isOpen, onClose]);

  useEffect(() => { // Effect to reset step index when modal opens
    if (isOpen) {
      setCurrentStepIndex(0); // Reset to Step 0 (Intro)
    }
  }, [isOpen]);

  

  // --- Portal Target ---
  const portalRoot = isClient ? document.getElementById('modal-root') : null;

  // --- Navigation Logic ---
  const goToNextStep = () => {
    setCurrentStepIndex((prevIndex) => Math.min(prevIndex + 1, totalSteps - 1));
  };
  const goToPrevStep = () => {
    setCurrentStepIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };


    // --- Effect for Desktop Scroll Wheel Navigation ---

    const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for debounce timeout


    // --- Effect for Desktop Scroll Wheel Navigation (Refactored) ---
  useEffect(() => {
    const container = scrollContainerRef.current;
    // Only setup if modal is open, on client, and container exists
    if (!isOpen || typeof window === 'undefined' || !container) return;

    // Check if likely on desktop
    const isLikelyDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (!isLikelyDesktop) return; // Don't add listener on mobile

    const debounceDelay = 150; // Milliseconds debounce

    const handleWheelScroll = (event: WheelEvent) => {
      // --- Debounce Check ---
      // If a timeout is already running, ignore this event
      if (wheelTimeoutRef.current) {
         event.preventDefault(); // Still prevent scroll while debouncing
         return;
      }

      const deltaY = event.deltaY;
      let navigated = false; // Flag to check if navigation actually happens

      // --- Determine Action & Update State ---
      // Scroll Down (Next)
      if (deltaY > 10) { // Threshold for scroll down
          setCurrentStepIndex(prevIndex => {
              if (prevIndex < totalSteps - 1) {
                  navigated = true; // Will navigate
                  return prevIndex + 1;
              }
              return prevIndex; // No change
          });
      }
      // Scroll Up (Previous)
      else if (deltaY < -10) { // Threshold for scroll up
          setCurrentStepIndex(prevIndex => {
              if (prevIndex > 0) {
                  navigated = true; // Will navigate
                  return prevIndex - 1;
              }
              return prevIndex; // No change
          });
      }

      // --- Handle Debounce & Prevent Default ---
      // If navigation actually occurred based on the state update logic
      if (navigated) {
        event.preventDefault(); // Prevent container scroll ONLY if we navigated

        // Set the debounce timeout - it will clear itself after the delay
        wheelTimeoutRef.current = setTimeout(() => {
          wheelTimeoutRef.current = null; // Allow next event after delay
        }, debounceDelay);
      }
    };

    // Add listener
    container.addEventListener('wheel', handleWheelScroll, { passive: false });

    // --- Cleanup Function ---
    return () => {
      container.removeEventListener('wheel', handleWheelScroll);
      // Clear any pending timeout when effect cleans up
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
        wheelTimeoutRef.current = null; // Reset ref on cleanup
      }
    };

  // --- Dependencies ---
  // isOpen: Add/remove listener correctly.
  // totalSteps: Ensure max step logic inside handler is correct.
  // No need for currentStepIndex, goToNextStep, goToPrevStep due to functional update.
  }, [isOpen, totalSteps]); // Simplified dependency array
  
  // --- Content Calculation for Current Step ---
  // For Desktop Left Column (Additive including Intro)
  const revealedTopParts = topParts.slice(0, currentStepIndex + 1);
  // For Mobile Top Section (Swapping including Intro)
  const currentTopPartMobile = topParts[currentStepIndex];
  // Get the SINGLE bottom part (SVG component instance or null) for the current step
  const currentBottomPart = bottomParts[currentStepIndex];

  // --- Event Handlers ---
  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation(); // Prevent closing modal when clicking inside content
  };

  // --- Button Elements ---
  const buttonClasses = "rounded px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50";
  const prevButtonClasses = `${buttonClasses} bg-card text-text hover:bg-card2`;
  const nextButtonClasses = `${buttonClasses} bg-card text-text hover:bg-card2`;
  const counterClasses = "flex items-center text-sm text-text";

  // Adjust counter text for Step 0
  const actualTotalSteps = totalSteps > 1 ? totalSteps - 1 : 0; // Number of actual steps after intro
  const counterText = `${currentStepIndex} / ${actualTotalSteps}`;

  const buttonsElement = (
      <>
          <button onClick={goToPrevStep} disabled={currentStepIndex === 0} className={prevButtonClasses} aria-label="Previous Step"><ArrowLeft/></button>
          <span className={counterClasses}>
              {counterText}
          </span>
          <button onClick={goToNextStep} disabled={currentStepIndex === totalSteps - 1} className={nextButtonClasses} aria-label="Next Step"><ArrowRight/></button>
      </>
  );

  // --- Modal JSX Structure ---
  const modalContent = (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-card bg-opacity-70 transition-opacity duration-300 ease-in-out" // Use your theme bg-bg
      onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title-id"
    >
      {/* Main Modal Box */}
      <div
        className="relative w-[95vw] h-[90vh] flex flex-col overflow-hidden rounded-lg bg-bg shadow-xl p-5" // Use theme bg-card
        onClick={handleContentClick}
      >
        <h2 id="modal-title-id" className="sr-only">{title}</h2>
        <button // Close Button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full p-1 bg-card text-text transition-colors hover:bg-primary hover:text-bg" // Use theme text/bg
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6"> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /> </svg>
        </button>

        {/* Fixed Heading Wrapper */}
        <div className="pb-4 border-b border-card2 mb-4 lg:mb-6 shrink-0">
           <h3 className="text-xl font-bold text-center text-text"> {/* Use theme text */}
               {title} {/* Display the passed title */}
           </h3>
        </div>

        {/* Scrollable Content Area - Handles overall scrolling */}
        <div className="flex-grow overflow-auto min-h-0" ref={scrollContainerRef}>

            {/* === Desktop Layout: 2 Columns === */}
            <div className="hidden h-full lg:grid lg:grid-cols-2 md:gap-x-8 lg:gap-x-12">
                {/* Left Column (Additive Top Parts including Step 0) */}
                <div className="space-y-4 min-h-0 overflow-y-auto p-6">
                     {revealedTopParts.map((Part, index) => (
                        <React.Fragment key={`desktop-revealed-top-${index}`}>{Part}</React.Fragment>
                     ))}
                </div>
                {/* Right Column (Single SVG Container) */}
                <div className="border-l border-card2 pl-8 lg:pl-12 min-h-0 flex flex-col py-4 mb-6">
                     {/* Inner wrapper adds padding, ensures min height, and centers content */}
                     {/* Use aspect-ratio to control SVG container shape if desired */}
                     <div
                        className="flex-grow min-h-[150px] flex items-center justify-center p-1 bg-bg"
                        style={{ aspectRatio: svgContainerAspectRatio }} // Control aspect ratio
                     >
                          {/* Render the SINGLE SVG component for the current step */}
                          {/* It should have scaling classes passed via lib/modalContents */}
                          {currentBottomPart}
                     </div>
                </div>
            </div>

            {/* === Mobile Layout: Vertical Stack === */}
            {/* Main container for mobile view, takes full height */}
            {/* Use relative positioning to anchor the bottom part */}
            <div className="lg:hidden flex flex-col h-full relative">

                 {/* Top Part: Scrolls in the space ABOVE the fixed-height bottom part */}
                 {/* Calculates max-height based on subtracting the bottom part's intended height */}
                 {/* Adjust 'h-[45%]' in calc if you change bottom part height */}
                 <div className="overflow-y-auto pr-2 mb-4 h-auto max-h-[calc(100%-65%-1rem)]"> {/* Example: Max height is 100% - 45% (SVG) - 1rem (gap) */}
                    {currentTopPartMobile}
                 </div>

                 {/* SVG Container: Fixed height percentage, positioned */}
                 {/* Use absolute positioning relative to the parent 'flex flex-col h-full relative' */}
                 {/* Pinned to bottom (implicitly due to height), takes full width */}
                 <div className="border-t border-card2 absolute bottom-0 left-0 right-0 h-[65%] flex flex-col"> {/* Example: Fixed 45% height */}
                      {/* Inner wrapper for padding/bg and centering */}
                      {/* Render container only if there is content for this step's bottom part */}
                     <div className="flex-grow min-h-0 flex items-center justify-center p-4 rounded">
                         {currentBottomPart ? currentBottomPart : <div className="text-sm text-text">No diagram for this step.</div>} {/* Show placeholder if no SVG */}
                     </div>
                 </div>
            </div>
        </div> {/* End Scrollable Content Area */}

         {/* Buttons Area (Outside scrollable area) */}
         <div className="sticky bottom-0 mt-auto flex justify-between border-t border-card2  p-4 pb-0 lg:hidden shrink-0"> {/* Use theme bg-card */}
             {buttonsElement}
         </div>
         <div className="hidden lg:flex justify-between border-t border-card2 p-4 pb-0  mt-auto shrink-0">
             {buttonsElement}
         </div>

      </div> {/* End Main Modal Box */}
    </div> // End Overlay
  );

  // --- Portal Rendering Logic ---
  if (!isOpen) return null;
  if (!isClient || !portalRoot) return null; // Wait for client & portal root
  return createPortal(modalContent, portalRoot);
};

export default MultiStageModal;