export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

// Design A buttons: 12px radius, 44-48px touch targets, visible hover / active / focus / loading / disabled.
const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fs-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-70 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary shadow-xs hover:bg-primary-hover active:brightness-95",
  secondary: "border border-border bg-card text-foreground hover:bg-subtle active:bg-border",
  ghost: "text-muted hover:bg-subtle hover:text-foreground active:bg-border",
  link: "text-link hover:underline active:opacity-80",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[44px] px-4 text-sm",
  md: "min-h-[44px] px-5 text-sm",
  lg: "min-h-[48px] px-6 text-base",
};

/** Class helper usable from server and client components (links and buttons alike). */
export function buttonVariants({
  variant = "secondary",
  size = "sm",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}
