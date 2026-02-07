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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-neo-yellow/50 backdrop-blur-sm bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden bg-white border-4 border-black shadow-neo-xl animate-pop"
        role="dialog"
        aria-modal="true"
        data-testid="modal-content"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-neo-red text-white border-2 border-black w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all z-20"
          aria-label="Close"
        >
          <span className="font-mono font-bold text-lg">X</span>
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
