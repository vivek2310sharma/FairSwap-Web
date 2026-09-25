"use client";

import { useState, forwardRef, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  containerClassName?: string;
  toggleAriaLabel?: {
    show?: string;
    hide?: string;
  };
  "data-testid"?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      id,
      className = "",
      containerClassName = "",
      toggleAriaLabel,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const showLabel = toggleAriaLabel?.show || "Show password";
    const hideLabel = toggleAriaLabel?.hide || "Hide password";
    const currentLabel = showPassword ? hideLabel : showLabel;
    const toggleTestId = props["data-testid"]
      ? `${props["data-testid"]}-toggle`
      : id
        ? `toggle-${id}-visibility`
        : "toggle-password-visibility";

    return (
      <div className={`relative mt-1 ${containerClassName}`.trim()}>
        <input
          {...props}
          ref={ref}
          id={id}
          type={showPassword ? "text" : "password"}
          disabled={disabled}
          className={`block w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500 ${className}`.trim()}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          aria-label={currentLabel}
          aria-pressed={showPassword}
          aria-controls={id}
          title={currentLabel}
          data-testid={toggleTestId}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 rounded-r-md transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
