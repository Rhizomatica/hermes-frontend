"use client";

import { useEffect, useState } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import SysInfo from "@/components/radio/SysInfo";
import CallerList, { type CallerEntry } from "@/components/radio/CallerList";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
<<<<<<< HEAD
import { LoadingSpinner } from "@platform/ui";
=======
import { LoadingSpinner } from "@hermes/ui";
>>>>>>> main

export default function RadioInfoPage() {
    useAuthGuard();
    const t = useTranslations("radioInfo");
    const [loading, setLoading] = useState(true);
    const [callers, setCallers] = useState<CallerEntry[]>([]);

    useEffect(() => {
        fetch("/api/caller")
            .then((r) => (r.ok ? r.json() : []))
            .then((data: CallerEntry[]) => setCallers(Array.isArray(data) ? data : []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const left = (
        <div className="flex items-center gap-3 min-w-0">
            <Link
                href="/home"
                className="text-orange-500 hover:text-orange-400 shrink-0"
                aria-label={t("back")}
            >
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </Link>
            <span className="text-gray-900 dark:text-white font-semibold text-base">
                {t("title")}
            </span>
        </div>
    );



    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
            <Navbar left={left} />
            {loading && <LoadingSpinner className="py-10" />}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <SysInfo />
                {!loading && <CallerList callers={callers}/>}
            </div>
        </div>
    );
}


