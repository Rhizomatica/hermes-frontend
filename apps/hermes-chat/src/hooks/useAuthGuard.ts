import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HermesUser } from "@platform/utils";

export function useAuthGuard(): HermesUser | null {
  const router = useRouter();
  const [user, setUser] = useState<HermesUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("hermes_user");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      setUser(JSON.parse(stored) as HermesUser);
    } catch {
      localStorage.removeItem("hermes_user");
      router.replace("/");
    }
  }, [router]);

  return user;
}
