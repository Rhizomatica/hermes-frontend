interface LoadingSpinnerProps {
  className?: string;
}

export default function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-4 border-orange-200 dark:border-orange-900/40" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
      </div>
      <span className="text-sm font-medium text-orange-500 animate-pulse tracking-wide">
        Loading…
      </span>
    </div>
  );
}
