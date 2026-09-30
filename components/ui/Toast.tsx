"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";

type ToastInput = { message: string; undo?: () => Promise<unknown> | void };
type ToastState = ToastInput & { id: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** `const toast = useToast(); toast({ message, undo })` — lišta dole na 5 s, s volitelným Zpět. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((input: ToastInput) => {
    nextId.current += 1;
    setToast({ ...input, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4"
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[6px] bg-ink py-2 pr-2 pl-4 text-[0.9375rem] text-white shadow-[0_8px_24px_-8px_rgb(21_24_28/0.4)]"
            >
              <span className="min-w-0 flex-1 py-1.5">{toast.message}</span>
              {toast.undo && (
                <button
                  type="button"
                  onClick={() => {
                    const undo = toast.undo;
                    setToast(null);
                    void undo?.();
                  }}
                  className="h-9 shrink-0 rounded-[4px] px-3 font-semibold text-form-soft active:bg-white/10"
                >
                  {t("common.undo")}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
