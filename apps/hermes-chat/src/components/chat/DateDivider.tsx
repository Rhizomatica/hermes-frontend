import { useLocale } from "next-intl";
import { formatDateDivider } from "@platform/utils";

interface DateDividerProps {
  dateStr: string;
}

export default function DateDivider({ dateStr }: DateDividerProps) {
  const locale = useLocale();
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">
        {formatDateDivider(dateStr, locale)}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
