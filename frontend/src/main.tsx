import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ready } from "./i18n";
import App from "./App";
import { applySettingsToDocument } from "./lib/settings";
import { registerServiceWorker } from "./lib/pwa";
import { loadRuntimeConfig } from "./lib/runtimeConfig";
import { reloadForNewBuild } from "./components/ErrorBoundary";

applySettingsToDocument();

// A page opened before a redeploy may ask for files that were replaced: reload once to get the new ones.
window.addEventListener("vite:preloadError", (e) => {
  if (reloadForNewBuild()) e.preventDefault();
});

// For Telugu/Hindi users this waits for one small file; English starts immediately.
void Promise.allSettled([ready, loadRuntimeConfig()]).then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);

registerServiceWorker();
