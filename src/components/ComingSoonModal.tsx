'use client';

import { useEffect } from 'react';
import ModalCloseButton from './ModalCloseButton';

/* "Not open yet" notice for landing card footers whose destination is gated.
 *
 * Follows the unified modal blueprint (TxModal shape): .modal-overlay-blur
 * backdrop, bg-card3 / border-border2 / rounded-xl / shadow-2xl panel, shared
 * ModalCloseButton. Dismissible by ✕, backdrop click, or Escape — nothing here
 * is a terminal-state gate, so every exit stays open. */
export default function ComingSoonModal({
  open,
  title,
  body,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay-blur fixed inset-0 z-[100] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border2 bg-card3 shadow-2xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="h3-app text-text">{title}</h3>
          <ModalCloseButton onClose={onClose} />
        </div>
        <p className="font-sans text-sm leading-relaxed text-text2">{body}</p>
        <button type="button" onClick={onClose} className="btn-game-secondary self-start">
          Got it
        </button>
      </div>
    </div>
  );
}
