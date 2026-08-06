interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 text-sm text-center px-4 py-2 shrink-0">
      {message}
    </div>
  );
}
