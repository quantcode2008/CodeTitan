"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl";
  className?: string;
}

/**
 * Editorial slide-over drawer for source documents, claims inspection, and audit logs.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "lg",
  className,
}: DrawerProps) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const widthClasses = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  }[width];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-hidden"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/30 backdrop-blur-[1px]"
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "w-screen bg-paper-raised border-l border-rule shadow-raised flex flex-col",
                widthClasses,
                className
              )}
            >
              {/* Drawer Header */}
              <div className="flex items-start justify-between px-6 py-4 border-b border-rule bg-paper">
                <div>
                  <h3 className="font-serif text-lg font-medium text-ink">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="mt-0.5 font-mono text-xs text-ink-soft">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="p-1 rounded-sm text-ink-soft hover:text-ink hover:bg-paper-sunken transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
                >
                  <X className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
