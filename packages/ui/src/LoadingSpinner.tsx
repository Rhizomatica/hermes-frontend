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