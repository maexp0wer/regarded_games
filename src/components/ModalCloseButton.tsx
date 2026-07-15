'use client';

/**
 * Canonical modal close control: a mono "✕" pinned top-right, muted by default
 * and lighting to full contrast on hover. Shared by every overlay modal so the
 * dismiss affordance reads the same everywhere (see TxModal / QuestBoard).
 */
export default function ModalCloseButton({
  onClose,
  className = '',
}: {
  onClose: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      type="button"
      className={`font-mono text-sm text-text2 hover:text-text leading-none shrink-0 transition-colors ${className}`}
    >
      ✕
    </button>
  );
}
