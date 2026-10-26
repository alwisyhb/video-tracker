import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface LightDismissDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const LightDismissDialog: React.FC<LightDismissDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without closedby support (per modern-web-guidance light-dismiss-a-dialog)
    let handleBackdropClick: ((event: MouseEvent) => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby={titleId}
      className="app-dialog"
    >
      <div className="dialog-inner">
        <div className="dialog-header">
          <div>
            <h2 id={titleId} className="dialog-title">
              {title}
            </h2>
            {subtitle && <p className="dialog-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="icon-btn"
            aria-label="Tutup dialog"
          >
            <X size={18} aria-hidden="true" />
            <span>Tutup</span>
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </dialog>
  );
};
