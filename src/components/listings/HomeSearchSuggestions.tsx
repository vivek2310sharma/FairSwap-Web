"use client";

import { useId, useState } from "react";
import type { Category } from "@/types/listing";

type Item = Pick<Category, "id" | "slug" | "name">;
const MAX = 5;

/** Real category matches for what the visitor has typed. Nothing is invented: no demo searches, no popularity claims. */
export function suggestionsFor(categories: Item[], query: string): Item[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return categories.filter((category) => category.name.toLowerCase().includes(needle)).slice(0, MAX);
}

/**
 * Search input with keyboard-operable category suggestions (listbox pattern on a search input: arrows move, Enter picks, Esc closes).
 * With no highlighted option Enter submits the form as before.
 */
export function HomeSearchInput({ categories, value, onChange, onPickCategory, id, placeholder, className }: {
  categories: Item[];
  value: string;
  onChange: (value: string) => void;
  onPickCategory: (slug: string) => void;
  id: string;
  placeholder: string;
  className?: string;
}) {
  const listId = useId();
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const options = dismissed ? [] : suggestionsFor(categories, value);
  const open = options.length > 0;
  const optionId = (index: number) => `${listId}-opt-${index}`;

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        type="search"
        name="q"
        maxLength={100}
        value={value}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        onChange={(event) => { onChange(event.target.value); setActive(-1); setDismissed(false); }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) { event.preventDefault(); setDismissed(true); setActive(-1); }
          else if (event.key === "ArrowDown" && open) { event.preventDefault(); setActive((active + 1) % options.length); }
          else if (event.key === "ArrowUp" && open) { event.preventDefault(); setActive((active - 1 + options.length) % options.length); }
          else if (event.key === "Enter" && open && active >= 0) { event.preventDefault(); onPickCategory(options[active].slug); setDismissed(true); }
        }}
        onBlur={() => setActive(-1)}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label="Category suggestions" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-lg">
          {options.map((option, index) => (
            <li
              key={option.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => { event.preventDefault(); onPickCategory(option.slug); setDismissed(true); }}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm text-foreground ${index === active ? "bg-subtle" : "hover:bg-subtle"}`}
            >
              <span className="truncate font-semibold">{option.name}</span>
              <span className="shrink-0 text-xs text-muted">Category</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
