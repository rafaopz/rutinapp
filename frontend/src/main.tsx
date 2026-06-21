import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// En desarrollo, elimina cualquier Service Worker / caché de una build previa
// de la PWA para que nunca sirva assets obsoletos (causa de "todo se ve roto").
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) return;
    Promise.all(regs.map((r) => r.unregister()))
      .then(() =>
        "caches" in window
          ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          : null,
      )
      .then(() => window.location.reload());
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
