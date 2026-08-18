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
  enabled = true,
}: {
  basePath?: string;
  enabled?: boolean;
}) {
  useEffect(() => {
    // Service workers are only meaningful in production. In dev each app
    // runs on its own origin (ports 4000/4001/4002) without the shared
    // shell controller, and registering a worker would just cache stale
    // bundles during fast iteration. Skipping avoids 404s for apps that
    // lack a public/sw.js.
    if (!enabled) return;

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
  }, [basePath, enabled]);

  return null;
}

export default ServiceWorkerRegistrator;