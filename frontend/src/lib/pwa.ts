/**
 * Offline support: cache the app and Python so it works without internet after the first visit.
 *
 * The service worker also adds the COOP/COEP headers Python needs when the web host
 * can't send them (some shared hosting). In that case the very first visit reloads
 * once, so the page is served through the service worker with those headers.
 */
const RELOAD_FLAG = "kalam:coi-reloaded";

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=${__BUILD_ID__}`)
      .then(() => {
        if (self.crossOriginIsolated) {
          sessionStorage.removeItem(RELOAD_FLAG);
          return;
        }
        let reloaded: string | null = null;
        try {
          reloaded = sessionStorage.getItem(RELOAD_FLAG);
        } catch {
          return;
        }
        if (reloaded) return; // tried once already (browser may not support isolation): don't loop
        const reload = () => {
          try {
            sessionStorage.setItem(RELOAD_FLAG, "1");
          } catch {
            return;
          }
          location.reload();
        };
        if (navigator.serviceWorker.controller) reload();
        else navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
      })
      .catch(() => {});
  });
}
