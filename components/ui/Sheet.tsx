"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { t } from "@/lib/i18n";

// Otevřené archy od nejspodnějšího po nejvrchnější — Escape a Tab obsluhuje
// jen ten nahoře (arch „Přidat hosta" se otevírá nad archem výdaje).
const openStack: object[] = [];
let scrollLocks = 0;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Spodní arch. Obsah se posouvá uvnitř, `footer` (hlavní akce) zůstává
 * přilepený dole nad bezpečnou zónou. Stáhnout dolů jde jen za úchyt —
 * tažení za celý arch by se bilo s posouváním obsahu.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const drag = useDragControls();
  // Portal do <body>: předek s backdrop-filter/transform (třeba sticky
  // hlavička) by jinak z `position: fixed` udělal pozici vůči sobě a arch by
  // se vykreslil uvnitř něj, bez možnosti na něco kliknout.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Vždy aktuální `onClose` bez toho, aby musel být v deps efektů níž —
  // volající ho předávají jako inline arrow function s novou identitou při
  // každém rerenderu (stejné jako `useEffectEvent`).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // focus dovnitř při otevření, návrat na spouštěcí prvek při zavření
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      // React `autoFocus` do DOM nepropisuje a pořadí vůči tomuhle efektu
      // není zaručené — pole, které má dostat klávesnici, nese data-autofocus
      const target = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      (target ?? dialogRef.current)?.focus({ preventScroll: true });
    } else {
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    }
  }, [open]);

  // pod otevřeným archem se stránka nesmí posouvat — počítadlo, ne uložená
  // předchozí hodnota: při přechodu arch → arch by se jinak zámek obnovil ve
  // špatném pořadí a stránka zůstala zamčená i po zavření všeho
  useEffect(() => {
    if (!open) return;
    scrollLocks += 1;
    document.body.style.overflow = "hidden";
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = "";
    };
  }, [open]);

  // Escape zavírá, Tab necykluje ven z archu
  useEffect(() => {
    if (!open) return;
    const token = {};
    openStack.push(token);

    function onKeyDown(e: KeyboardEvent) {
      if (openStack[openStack.length - 1] !== token) return;
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openStack.splice(openStack.indexOf(token), 1);
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => onCloseRef.current()}
            className="fixed inset-0 z-40 bg-ink/30"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.28 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onCloseRef.current();
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-[20px] bg-paper shadow-[0_-12px_40px_-12px_rgb(21_24_28/0.35)] outline-none"
          >
            <div
              onPointerDown={(e) => drag.start(e)}
              className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2"
            >
              <span className="h-1 w-9 rounded-full bg-rule" />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-2 pb-3">
              <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
              <button
                type="button"
                onClick={() => onCloseRef.current()}
                aria-label={t("common.close")}
                className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink-2 active:bg-rule-soft"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-rule bg-paper px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
            {!footer && <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" />}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
