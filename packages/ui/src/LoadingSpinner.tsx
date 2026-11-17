import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  label?: string;
}

export default function LoadingSpinner({
  className = "",
  size = 64,
  label = "Loading…",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 bg-transparent${className ? ` ${className}` : ""}`}>
      <Loader2
        className="animate-spin text-orange-500"
        style={{ width: size, height: size }}
        aria-label={label}
      />
      <span className="text-lg font-medium text-orange-500 animate-pulse tracking-wide">
        {label}
      </span>
    </div>
  );
}

/**
 * Small, label-less spinner for inline use inside buttons and rows.
 *
 * Unlike {@link LoadingSpinner}, it keeps the surrounding text and uses the
 * current text color, so it blends into any button variant.
 *
 * @example
 * <button disabled={pending}>
 *   {pending && <InlineSpinner label={t('saving')} />}
 *   {t('save')}
 * </button>
 */
export function InlineSpinner({
  className = "",
  size = 16,
  label = "Loading…",
}: LoadingSpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={`shrink-0 animate-spin text-current${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
    />
  );
}