"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { useLocale } from "./LocaleProvider";

export function ReviewDialog({
  title,
  onClose,
  children,
  eyebrow,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  eyebrow?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useLocale();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="permission-dialog"
      aria-labelledby="review-title"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <div className="eyebrow">{eyebrow ?? t("BEFORE YOUR WALLET OPENS")}</div>
          <h2 id="review-title">{title}</h2>
        </div>
        <button autoFocus className="secondary" onClick={onClose} aria-label={t("Close")}>
          ✕
        </button>
      </header>
      {children}
    </dialog>
  );
}
