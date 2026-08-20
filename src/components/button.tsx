import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-600/20 hover:bg-fuchsia-700 hover:shadow-md hover:shadow-fuchsia-600/30 focus-visible:ring-fuchsia-400",
  secondary:
    "border border-neutral-300 text-neutral-700 bg-white hover:border-fuchsia-300 hover:bg-fuchsia-50/60 hover:text-fuchsia-900 focus-visible:ring-fuchsia-300",
  danger:
    "border border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-300 focus-visible:ring-red-300",
  ghost: "text-neutral-500 hover:text-fuchsia-700 focus-visible:ring-fuchsia-300",
};

/** Same look as <Button>, for non-<button> elements (e.g. Next <Link>) that can't be a real button. */
export function buttonClass(variant: Variant = "primary", className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-[0.97] ${VARIANT_CLASSES[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  pending = false,
  pendingText,
  className = "",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  pending?: boolean;
  pendingText?: string;
}) {
  return (
    <button
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
