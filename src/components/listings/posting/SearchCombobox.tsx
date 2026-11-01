"use client";
import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./Posting.module.css";
export interface Choice {
    id: string;
    name: string;
    aliases?: string[];
}
export default function SearchCombobox({ id, label, options, value, onChange, disabled = false, error }: {
    id: string;
    label: string;
    options: Choice[];
    value: string;
    onChange: (id: string) => void;
    disabled?: boolean;
    error?: string;
}) {
    const listId = useId();
    const input = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(-1);
    const activeOption = useRef(-1);
    const filterText = useRef("");
    const expanded = useRef(false);
    const selected = options.find(o => o.id === value);
    const hits = options.filter(o => [o.name, ...o.aliases ?? []].some(v => v.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
    const close = () => { expanded.current=false;filterText.current="";activeOption.current=-1;setOpen(false); setQuery(""); setActive(-1); };
    const choose = (id: string) => { onChange(id); close(); input.current?.focus(); };
    return <div className={styles.combo}><label htmlFor={id}>{label}</label><div className="relative"><input ref={input} id={id} role="combobox" autoComplete="off" aria-autocomplete="list" aria-controls={listId} aria-expanded={open} aria-activedescendant={open && active >= 0 && hits[active] ? `${listId}-${active}` : undefined} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} disabled={disabled} value={open ? query : selected?.name ?? ""} placeholder={disabled ? "Choose a brand first" : `Search or choose ${label.toLowerCase()}`} onClick={() => { expanded.current=true;filterText.current="";activeOption.current=-1;setOpen(true); setQuery(""); setActive(-1); }} onBlur={close} onChange={e => { expanded.current=true;filterText.current=e.target.value;activeOption.current=-1;setQuery(e.target.value); setOpen(true); setActive(-1); }} onKeyDown={e => {
            if (e.key === "Escape") {
                e.preventDefault();
                close();
                return;
            }
            if (e.key === "Tab") {
                close();
                return;
            }
            if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(e.key))
                return;
            if (e.key === "Enter") {
                e.preventDefault();
                const available=options.filter(o=>[o.name,...o.aliases??[]].some(v=>v.toLocaleLowerCase().includes(filterText.current.toLocaleLowerCase())));
                if (expanded.current && activeOption.current >= 0 && available[activeOption.current])
                    choose(available[activeOption.current].id);
                return;
            }
            if (!open && ["Home", "End"].includes(e.key))
                return;
            e.preventDefault();
            expanded.current=true;setOpen(true);
            const count = options.filter(o=>[o.name,...o.aliases??[]].some(v=>v.toLocaleLowerCase().includes(filterText.current.toLocaleLowerCase()))).length;
            if (!count)
                return;
            const next = e.key === "Home" ? 0 : e.key === "End" ? count - 1 : e.key === "ArrowDown" ? (activeOption.current + 1) % count : activeOption.current <= 0 ? count - 1 : activeOption.current - 1;
            activeOption.current=next;setActive(next);
            document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
        }}/><ChevronDown aria-hidden="true" size={18} className="pointer-events-none absolute right-3 top-5 text-muted"/></div><ul id={listId} role="listbox" aria-label={`${label} options`} hidden={!open} className={styles.options}>{hits.map((o, i) => <li key={o.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} onPointerDown={e => e.preventDefault()} onClick={() => choose(o.id)}>{o.name}</li>)}{!hits.length && <li role="presentation">No matches. Try another name.</li>}</ul><span className="sr-only" role="status">{open ? `${hits.length} options. Use arrow keys and Enter to choose.` : ""}</span></div>;
}
