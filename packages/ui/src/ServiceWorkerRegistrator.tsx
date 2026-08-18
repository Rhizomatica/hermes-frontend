"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on window load.
 *
 * Kept in a dedicated client component so the registration logic
 * lives alongside client-only code rather than an inline
 * dangerouslySetInnerHTML script in the server layout.
 */
export function ServiceWorkerRegistrator({
  basePath = '',
}: {
  basePath?: string;
}) {
  useEffect(() => {
    // Only the app at the origin root owns the service worker. Sub-apps
    // mounted under a base path (/gps, /chat) share the shell's controller;
    // registering again would cause controller churn and stale-asset bugs.
    if (basePath) return;

    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js");
      };

      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register, { once: true });
        return () =>
          window.removeEventListener("load", register);
      }
    }
  }, [basePath]);

  return null;
}

export default ServiceWorkerRegistrator;