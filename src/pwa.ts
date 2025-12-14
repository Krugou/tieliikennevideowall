import { registerSW } from "virtual:pwa-register";

const isStandaloneDisplayMode = () => {
  if (typeof window === "undefined") return false;
  // Android/Chromium
  const mql = window.matchMedia?.("(display-mode: standalone)");
  if (mql?.matches) return true;
  // iOS Safari
  return Boolean((navigator as any)?.standalone);
};

export const setupPwaAutoUpdate = () => {
  // In normal browser mode, a background SW update is fine.
  // In installed PWA mode, users expect the latest version when available.
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (isStandaloneDisplayMode()) {
        // Skip waiting + reload to activate the new version.
        void updateSW(true);
      }
    },
    onRegisteredSW(_swUrl: string, registration?: ServiceWorkerRegistration) {
      if (!registration) return;

      // Proactively check for updates while running in standalone.
      if (isStandaloneDisplayMode()) {
        const intervalMs = 60 * 1000;
        setInterval(() => {
          void registration.update();
        }, intervalMs);
      }
    },
  });
};

setupPwaAutoUpdate();
