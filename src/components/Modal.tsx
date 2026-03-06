import React, { useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

const Modal: React.FC<Props> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal panel — responsive max-width, full width on mobile */}
      <div
        className="relative z-10 w-full max-w-[calc(100vw-1rem)] sm:max-w-lg md:max-w-2xl lg:max-w-4xl overflow-hidden bg-white border border-finn-border shadow-xl rounded-lg animate-pop"
        role="dialog"
        aria-modal="true"
        data-testid="modal-content"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 flex items-center justify-center rounded-full text-finn-muted hover:text-finn-text hover:bg-finn-bg transition-colors z-20"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
