import { createPortal } from 'react-dom';
import { useState, useRef, useEffect } from 'react';

export function Portal({ children, text, isVisible }: { children: React.ReactNode, text: string, isVisible: boolean }) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 6, // 6px gap above the row
        left: rect.left + rect.width / 2
      });
    }
  }, [isVisible]);

  return (
    <div ref={triggerRef} className="contents"> {/* 'contents' prevents this div from affecting grid/layout */}
      {children}
      {isVisible && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-9999 pointer-events-none -translate-x-1/2 -translate-y-full px-2 py-1 bg-black/95 border border-white/20 rounded text-[10px] text-white whitespace-nowrap shadow-2xl animate-in fade-in zoom-in duration-150"
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
          <div className="absolute top-[98%] left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-black/95" />
        </div>,
        document.body
      )}
    </div>
  );
}