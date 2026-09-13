"use client";

import { useTransition } from "react";
import { clearUnavailableFavouritesAction } from "./actions";
import { Trash2 } from "lucide-react";

interface ClearUnavailableButtonProps {
  unavailableIds: string[];
}

export function ClearUnavailableButton({ unavailableIds }: ClearUnavailableButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClear = () => {
    startTransition(async () => {
      await clearUnavailableFavouritesAction(unavailableIds);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClear}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100/60 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 focus:outline-none dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{isPending ? "Removing..." : "Remove unavailable items"}</span>
    </button>
  );
}
