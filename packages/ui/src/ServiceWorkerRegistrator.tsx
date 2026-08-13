"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on window load.
 *
 * Kept in a dedicated client component so the registration logic
 * lives alongside client-only code rather than an inline
 * dangerouslySetInnerHTML script in the server layout.
 */
export function ServiceWorkerRegistrator() {
  useEffect(() => {
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
  }, []);

  return null;
}

export default ServiceWorkerRegistrator;