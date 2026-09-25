import Link from "next/link";
import { X } from "lucide-react";

interface AuthCloseLinkProps {
  className?: string;
}

export function AuthCloseLink({ className = "" }: AuthCloseLinkProps) {
  return (
    <Link
      href="/"
      aria-label="Close"
      title="Close"
      className={`absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center justify-center rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${className}`.trim()}
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}
