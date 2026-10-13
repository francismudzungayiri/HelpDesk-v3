import React, { useEffect, useId, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible dialog: labelled, traps focus, closes on Escape or backdrop, restores focus on close.
const Modal = ({ title, description, onClose, children, size = 'md', busy = false }) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector('input:not([disabled]), select, textarea') || dialog?.querySelector(FOCUSABLE);
    first?.focus();

    const handleKey = (event) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`card modal-card modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <h2 id={titleId} className="modal-title">{title}</h2>
        {description && <p id={descriptionId} className="modal-description">{description}</p>}
        {children}
      </div>
    </div>
  );
};

export default Modal;
