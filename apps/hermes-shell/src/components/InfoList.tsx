"use client";

interface InfoItem {
    label: string;
    value: React.ReactNode;
}

interface InfoListProps {
    title?: string;
    items: InfoItem[];
}

function InfoRow({ label, value }: InfoItem) {
    return (
        <div className="group flex flex-col sm:flex-row sm:items-center gap-1 py-3.5 px-4 border-b border-gray-100 dark:border-gray-700/60 last:border-0 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-700/30 rounded-lg">
            <span className="sm:w-44 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 shrink-0">
                {label}
            </span>
            <span className="text-sm text-gray-800 dark:text-gray-100 break-all font-medium">{value}</span>
        </div>
    );
}

export default function InfoList({ title, items }: InfoListProps) {
    return (
        <div className="bg-white/70 dark:bg-gray-800/80 rounded-2xl shadow-lg shadow-gray-900/5 ring-1 ring-gray-200/70 dark:ring-gray-700/70 backdrop-blur overflow-hidden">
            {title && (
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {title}
                    </p>
                </div>
            )}
            <div className="px-1 py-1">
                {items.map((item, i) => (
                    <InfoRow key={i} label={item.label} value={item.value} />
                ))}
            </div>
        </div>
    );
}