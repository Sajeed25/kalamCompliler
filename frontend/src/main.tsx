import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ready } from "./i18n";
import App from "./App";
import { applySettingsToDocument } from "./lib/settings";
import { registerServiceWorker } from "./lib/pwa";

applySettingsToDocument();

// For Telugu/Hindi users this waits for one small file; English starts immediately.
void ready.finally(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);

registerServiceWorker();
