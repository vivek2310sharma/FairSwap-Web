"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Loader2, AlertCircle } from "lucide-react";
import { ListingAction, ResolvedListingActions } from "@/lib/listings/action-matrix";
import { submitListingAction, transitionListingAction } from "./actions";

interface ListingActionsContainerProps {
  listingId: string;
  actions: ResolvedListingActions;
}

export function ListingActionsContainer({
  listingId,
  actions,
}: ListingActionsContainerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<ListingAction | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState<number>(0);
  const [activeConfirmationAction, setActiveConfirmationAction] = useState<ListingAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  const lastFocusedTriggerRef = useRef<HTMLElement | null>(null);
  const modalCancelButtonRef = useRef<HTMLButtonElement>(null);
  const modalConfirmButtonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Focus management when overflow menu opens
  useEffect(() => {
    if (menuOpen) {
      requestAnimationFrame(() => {
        menuItemRefs.current[0]?.focus();
      });
    }
  }, [menuOpen]);

  // Focus management when confirmation modal opens
  useEffect(() => {
    if (activeConfirmationAction) {
      requestAnimationFrame(() => {
        modalCancelButtonRef.current?.focus();
      });
    }
  }, [activeConfirmationAction]);

  // Handle Escape key and keyboard focus traps
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (activeConfirmationAction) {
        if (event.key === "Escape") {
          event.preventDefault();
          setActiveConfirmationAction(null);
          lastFocusedTriggerRef.current?.focus();
          return;
        }

        // Focus trap inside modal
        if (event.key === "Tab") {
          const focusables = [
            modalCancelButtonRef.current,
            modalConfirmButtonRef.current,
          ].filter(Boolean) as HTMLElement[];

          if (focusables.length === 0) return;

          const firstElement = focusables[0];
          const lastElement = focusables[focusables.length - 1];

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
        return;
      }

      if (menuOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          setMenuOpen(false);
          menuButtonRef.current?.focus();
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setFocusedMenuIndex((prev) => {
            const next = (prev + 1) % actions.secondary.length;
            menuItemRefs.current[next]?.focus();
            return next;
          });
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setFocusedMenuIndex((prev) => {
            const next = (prev - 1 + actions.secondary.length) % actions.secondary.length;
            menuItemRefs.current[next]?.focus();
            return next;
          });
          return;
        }

        if (event.key === "Home") {
          event.preventDefault();
          setFocusedMenuIndex(0);
          menuItemRefs.current[0]?.focus();
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          const last = actions.secondary.length - 1;
          setFocusedMenuIndex(last);
          menuItemRefs.current[last]?.focus();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, activeConfirmationAction, actions.secondary.length]);

  async function executeAction(action: ListingAction, triggerElement?: HTMLElement) {
    setErrorMessage(null);

    if (action.type === "link" && action.href) {
      router.push(action.href);
      return;
    }

    if (action.requiresConfirmation && !activeConfirmationAction) {
      // If menu was open, focus restores to persistent ⋯ menu button because menuitem unmounts
      lastFocusedTriggerRef.current = menuOpen ? menuButtonRef.current : triggerElement || (document.activeElement as HTMLElement);
      setActiveConfirmationAction(action);
      setMenuOpen(false);
      return;
    }

    if (activeConfirmationAction) {
      setActiveConfirmationAction(null);
    }
    setMenuOpen(false);

    setPendingAction(action);

    startTransition(async () => {
      try {
        let result;
        if (action.type === "submit_action") {
          result = await submitListingAction(listingId);
        } else if (action.type === "transition_action" && action.transitionAction) {
          result = await transitionListingAction(listingId, action.transitionAction);
        }

        if (result?.error) {
          if (result.redirectTo) {
            router.push(result.redirectTo);
            return;
          }
          setErrorMessage(result.error);
        } else {
          router.refresh();
        }
      } catch {
        setErrorMessage("An unexpected error occurred. Please try again.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  const primary = actions.primary;
  const secondary = actions.secondary;
  const isPrimaryPending = isPending && pendingAction?.id === primary.id;
  const isSecondaryPending = isPending && pendingAction && pendingAction.id !== primary.id;

  return (
    <div className="flex flex-col items-end gap-2 sm:items-center sm:flex-row sm:gap-2">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-800 border border-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action-specific secondary mutation progress feedback when overflow menu is closed */}
      {isSecondaryPending && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
          <span>Processing: {pendingAction.label}...</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Primary Action Button or Link */}
        {primary.type === "link" && primary.href ? (
          <Link
            href={primary.href}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition"
          >
            {primary.label}
          </Link>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={(e) => executeAction(primary, e.currentTarget)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isPrimaryPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            <span>{isPrimaryPending ? "Processing..." : primary.label}</span>
          </button>
        )}

        {/* Secondary Actions Overflow Menu (⋯) */}
        {secondary.length > 0 && (
          <div className="relative inline-block text-left" ref={menuRef}>
            <button
              ref={menuButtonRef}
              type="button"
              disabled={isPending}
              onClick={() => {
                setFocusedMenuIndex(0);
                setMenuOpen((prev) => !prev);
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="More actions"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition disabled:opacity-50"
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                aria-label="Secondary actions"
                className="absolute right-0 z-30 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
              >
                {secondary.map((sec, idx) => {
                  const isSecPending = isPending && pendingAction?.id === sec.id;
                  if (sec.type === "link" && sec.href) {
                    return (
                      <Link
                        key={sec.id + sec.label}
                        href={sec.href}
                        role="menuitem"
                        tabIndex={focusedMenuIndex === idx ? 0 : -1}
                        ref={(el) => {
                          menuItemRefs.current[idx] = el;
                        }}
                        onClick={() => setMenuOpen(false)}
                        className="block w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:outline-none min-h-[44px] flex items-center"
                      >
                        {sec.label}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={sec.id + sec.label}
                      type="button"
                      role="menuitem"
                      tabIndex={focusedMenuIndex === idx ? 0 : -1}
                      ref={(el) => {
                        menuItemRefs.current[idx] = el;
                      }}
                      disabled={isPending}
                      onClick={(e) => executeAction(sec, e.currentTarget)}
                      className="block w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:outline-none disabled:opacity-50 min-h-[44px] flex items-center gap-1.5"
                    >
                      {isSecPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                      <span>{isSecPending ? "Processing..." : sec.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {activeConfirmationAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl transition-all border border-gray-200">
            <h3 id="modal-headline" className="text-lg font-bold text-gray-900">
              {activeConfirmationAction.confirmationTitle || "Confirm Action"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {activeConfirmationAction.confirmationMessage ||
                "Are you sure you want to perform this action?"}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={modalCancelButtonRef}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setActiveConfirmationAction(null);
                  lastFocusedTriggerRef.current?.focus();
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
              >
                Cancel
              </button>
              <button
                ref={modalConfirmButtonRef}
                type="button"
                disabled={isPending}
                onClick={() =>
                  executeAction(
                    { ...activeConfirmationAction, requiresConfirmation: false },
                    lastFocusedTriggerRef.current || undefined
                  )
                }
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                <span>{isPending ? "Processing..." : "Confirm"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
