"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "info" | "success" | "warning" | "error";
  duration?: number;
}

export interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

/**
 * Editorial notification toast stack.
 * Anchored quietly at bottom-right with crisp hairline borders.
 */
export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = {
            info: Info,
            success: CheckCircle2,
            warning: AlertTriangle,
            error: XCircle,
          }[toast.variant || "info"];

          const iconColor = {
            info: "text-slate",
            success: "text-moss",
            warning: "text-ochre",
            error: "text-oxblood",
          }[toast.variant || "info"];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "pointer-events-auto p-3.5 bg-paper-raised border border-rule shadow-raised rounded-sm flex items-start gap-3",
                "focus-within:ring-1 focus-within:ring-ink"
              )}
            >
              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0 stroke-[1.5]", iconColor)} />
              <div className="flex-1">
                <p className="font-sans text-xs font-semibold text-ink leading-tight">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-1 font-sans text-xs text-ink-soft leading-normal">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="p-0.5 text-ink-faint hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
